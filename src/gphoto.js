const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const run = promisify(execFile);
let cameraQueue = Promise.resolve();

function useCamera(task) {
  const result = cameraQueue.then(task, task);
  cameraQueue = result.catch(() => {});
  return result;
}

async function releaseDesktopCameraMount() {
  try {
    const { stdout } = await run('gio', ['mount', '-l'], { timeout: 5000 });
    const mounts = [...stdout.matchAll(/-> (gphoto2:\/\/\S+)/g)].map((match) => match[1]);
    for (const mount of new Set(mounts)) {
      await run('gio', ['mount', '-u', mount], { timeout: 10000 });
    }
    if (mounts.length) await new Promise((resolve) => setTimeout(resolve, 500));
    return mounts.length > 0;
  } catch {
    return false;
  }
}

async function runGPhoto(args, timeout = 30000, options = {}) {
  try {
    return await useCamera(async () => {
      try {
        return await run('gphoto2', args, { timeout, maxBuffer: 1024 * 1024, ...options });
      } catch (error) {
        const message = String(error.stderr || error.message);
        if (!/Could not claim the USB device|Device or resource busy/i.test(message) ||
            !await releaseDesktopCameraMount()) throw error;
        return run('gphoto2', args, { timeout, maxBuffer: 1024 * 1024, ...options });
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Chưa cài gPhoto2. Hãy cài gphoto2 rồi mở lại ứng dụng.');
    }
    throw new Error(String(error.stderr || error.message).trim());
  }
}

async function detectCamera() {
  const { stdout } = await runGPhoto(['--auto-detect'], 10000);
  const cameras = stdout.split('\n').slice(2).map((line) => line.trim()).filter(Boolean);
  return { connected: cameras.length > 0, cameras };
}

async function capturePhoto(filePath) {
  await runGPhoto(['--capture-image-and-download', '--filename', filePath, '--force-overwrite'], 60000);
  return filePath;
}

async function capturePreview() {
  const { stdout } = await runGPhoto(['--capture-preview', '--stdout'], 15000, {
    encoding: 'buffer', maxBuffer: 4 * 1024 * 1024
  });
  if (stdout[0] !== 0xff || stdout[1] !== 0xd8) throw new Error('Camera không trả về ảnh preview JPEG.');
  return stdout;
}

module.exports = { detectCamera, capturePhoto, capturePreview };
