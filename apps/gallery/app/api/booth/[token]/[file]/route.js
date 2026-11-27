import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { query } from '../../../../../lib/database.js';
import { apiEnabled } from '../../../../../lib/deployment.js';
import { assetPath, authorized, contentType, failure, findSession, privateHeaders, validFilename } from '../../../../../lib/sessions.js';

export const runtime = 'nodejs';
const limits = { 'image/jpeg': 45_000_000, 'video/mp4': 300_000_000 };

export async function PUT(request, { params }) {
  if (!apiEnabled()) return failure('Not found', 404);
  if (!authorized(request)) return failure('Unauthorized', 401);
  const { token, file } = await params;
  if (!validFilename(file)) return failure('Invalid file name', 400);
  const session = await findSession(token);
  if (!session || session.expired) return failure('Session unavailable', session?.expired ? 410 : 404);
  const type = contentType(file);
  const length = Number(request.headers.get('content-length'));
  if (request.headers.get('content-type') !== type || !request.body || !Number.isSafeInteger(length) || length < 12) {
    return failure('Invalid upload', 400);
  }
  if (length > limits[type]) return failure('File too large', 413);
  if (session.assets.some((asset) => asset.filename === file && Number(asset.bytes) === length)) {
    return new Response(null, { status: 204, headers: privateHeaders });
  }
  if (session.ready) return failure('Session already published', 409);

  const destination = assetPath(token, file);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = destination + '.' + randomUUID() + '.part';
  let bytes = 0;
  const sizeGuard = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > length) callback(new Error('Upload exceeded declared size'));
      else callback(null, chunk);
    }
  });
  try {
    await pipeline(Readable.fromWeb(request.body), sizeGuard, createWriteStream(temporary, { flags: 'wx' }));
    if (bytes !== length) return failure('Incomplete upload', 400);
    const fileHandle = await open(temporary, 'r');
    const header = Buffer.alloc(12);
    try { await fileHandle.read(header, 0, header.length, 0); }
    finally { await fileHandle.close(); }
    const valid = type === 'image/jpeg'
      ? header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
      : header.toString('ascii', 4, 8) === 'ftyp';
    if (!valid) return failure('Invalid file format', 415);
    await rename(temporary, destination);
    await query(`INSERT INTO booth_assets (token, filename, bytes) VALUES ($1, $2, $3)
      ON CONFLICT (token, filename) DO UPDATE SET bytes = EXCLUDED.bytes`, [token, file, bytes]);
    return new Response(null, { status: 204, headers: privateHeaders });
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
