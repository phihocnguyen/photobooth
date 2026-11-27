const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const validSessionToken = (token) => typeof token === 'string' && /^[A-Za-z0-9_-]{32}$/.test(token);

function baseUrl(name, fallback) {
  const value = (process.env[name] || fallback)?.trim();
  if (!value) return null;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} must be an HTTP(S) base URL.`);
  }
  return url.href.replace(/\/+$/, '');
}

function createGallerySync(userData) {
  const directory = path.join(userData, 'gallery-sessions');
  const key = process.env.GALLERY_UPLOAD_KEY;
  const legacyBase = process.env.GALLERY_BASE_URL;
  const apiBase = baseUrl('GALLERY_API_URL', legacyBase);
  const webBase = baseUrl('GALLERY_PUBLIC_URL', legacyBase || (apiBase && new URL(apiBase).pathname === '/' ? apiBase : null));
  const configured = Boolean(key && apiBase && webBase);
  const manifestPath = (token) => path.join(directory, `${token}.json`);
  let running;
  let pending;

  async function read(token) {
    if (!validSessionToken(token)) throw new Error('Phiên chụp không hợp lệ.');
    return JSON.parse(await fs.readFile(manifestPath(token), 'utf8'));
  }

  async function save(manifest) {
    await fs.mkdir(directory, { recursive: true });
    const destination = manifestPath(manifest.token);
    const temp = destination + '.' + crypto.randomUUID() + '.tmp';
    try {
      await fs.writeFile(temp, JSON.stringify(manifest), { flag: 'wx', mode: 0o600 });
      await fs.rename(temp, destination);
    } finally {
      await fs.unlink(temp).catch(() => {});
    }
  }

  async function request(endpoint, method, headers = {}, body) {
    const response = await fetch(`${apiBase}/api/booth/${endpoint}`, {
      method, headers: { ...headers, Authorization: `Bearer ${key}` }, body,
      duplex: body ? 'half' : undefined, redirect: 'error',
      signal: AbortSignal.timeout(240_000)
    });
    if (!response.ok) {
      const error = new Error(`Gallery HTTP ${response.status}`);
      error.status = response.status;
      await response.body?.cancel();
      throw error;
    }
  }

  function register(manifest) {
    return request(manifest.token, 'PUT', { 'X-Capture-Time': manifest.createdAt });
  }

  async function upload(manifest) {
    await register(manifest);
    for (const asset of manifest.assets) {
      const disk = await fs.stat(asset.filePath);
      await request(`${manifest.token}/${asset.filename}`, 'PUT', {
        'Content-Length': String(disk.size),
        'Content-Type': asset.filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'
      }, createReadStream(asset.filePath));
    }
    await request(manifest.token, 'POST', { 'Content-Type': 'application/json' },
      JSON.stringify({ files: manifest.assets.map(({ filename }) => filename) }));
  }

  function sync(newlyQueued = false) {
    if (!configured) return;
    if (running) {
      if (newlyQueued) pending = true;
      return;
    }
    running = (async () => {
      await fs.mkdir(directory, { recursive: true });
      const names = await fs.readdir(directory);
      for (const name of names) {
        const token = name.endsWith('.json') ? name.slice(0, -5) : '';
        if (!validSessionToken(token)) continue;
        const manifest = await read(token).catch(() => null);
        if (!manifest || manifest.state !== 'queued') continue;
        try {
          await upload(manifest);
          manifest.state = 'ready';
          delete manifest.error;
        } catch (error) {
          if (error.status === 410) manifest.state = 'expired';
          manifest.error = error.status ? error.message : 'Chưa kết nối được gallery hoặc chưa đọc được file. Máy sẽ thử lại.';
        }
        await save(manifest);
      }
    })().catch((error) => console.error('Gallery sync:', error.message)).finally(() => {
      running = undefined;
      if (pending) {
        pending = false;
        sync();
      }
    });
  }

  async function start() {
    const manifest = {
      token: crypto.randomBytes(24).toString('base64url'),
      createdAt: new Date().toISOString(),
      state: 'draft',
      originals: []
    };
    await save(manifest);
    if (configured) register(manifest).catch(() => {});
    return manifest.token;
  }

  async function localAsset(filePath, subdirectory, filename) {
    if (typeof filePath !== 'string') throw new Error('File phiên chụp không hợp lệ.');
    const expected = await fs.realpath(path.join(userData, subdirectory));
    const resolved = await fs.realpath(filePath);
    if (path.dirname(resolved) !== expected || path.extname(resolved).toLowerCase() !== path.extname(filename)) {
      throw new Error('File phiên chụp nằm ngoài thư mục lưu ảnh.');
    }
    return { filePath: resolved, filename };
  }

  async function record(token, kind, filePath) {
    const manifest = await read(token);
    if (manifest.state !== 'draft') throw new Error('Phiên chụp đã được hoàn tất.');
    if (kind === 'original') {
      const index = manifest.originals.length + 1;
      const asset = await localAsset(filePath, 'captures', `original-${String(index).padStart(2, '0')}.jpg`);
      if (manifest.originals.some((original) => original.filePath === asset.filePath)) return;
      if (index > 99) throw new Error('Phiên chụp đã đủ ảnh.');
      manifest.originals.push(asset);
    } else if (kind === 'video') {
      manifest.video = await localAsset(filePath, 'videos', 'video.mp4');
    } else {
      throw new Error('File phiên chụp không hợp lệ.');
    }
    await save(manifest);
  }

  async function publish(token, composite) {
    const manifest = await read(token);
    if (manifest.state !== 'draft') return describe(manifest, true);
    if (!manifest.originals?.length) {
      throw new Error('Danh sách ảnh gốc không hợp lệ.');
    }
    manifest.assets = [
      ...manifest.originals,
      await localAsset(composite, 'exports', 'photobooth.jpg'),
      ...(manifest.video ? [manifest.video] : [])
    ];
    manifest.state = 'queued';
    await save(manifest);
    sync(true);
    return describe(manifest, true);
  }

  async function describe(manifest, includeQr) {
    if (!configured) return { state: 'local' };
    const url = `${webBase}/session/${manifest.token}`;
    return {
      state: manifest.state, error: manifest.error, url,
      ...(includeQr ? { qr: await QRCode.toDataURL(url, { width: 520, margin: 3, errorCorrectionLevel: 'M' }) } : {})
    };
  }

  const timer = setInterval(sync, 20_000);
  timer.unref();
  sync();
  return { start, record, publish, status: async (token) => describe(await read(token), false) };
}

module.exports = { createGallerySync, validSessionToken };
