import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import yazl from 'yazl';
import { apiEnabled } from '../../../../../lib/deployment.js';
import { assetPath, contentType, failure, findSession, privateHeaders } from '../../../../../lib/sessions.js';

export const runtime = 'nodejs';

function rangeFor(header, length) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(length - 1, Number(match[2])) : length - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end
    ? { start, end } : null;
}

export async function GET(request, { params }) {
  if (!apiEnabled()) return failure('Not found', 404);
  const { token, file } = await params;
  const session = await findSession(token);
  if (!session || session.expired) return failure('Buổi chụp không còn khả dụng.', session?.expired ? 410 : 404);
  if (!session.ready) return failure('Ảnh đang được đồng bộ.', 404);
  if (file === 'photobooth.zip') {
    const archive = new yazl.ZipFile();
    const body = Readable.toWeb(archive.outputStream);
    archive.on('error', (error) => archive.outputStream.destroy(error));
    request.signal.addEventListener('abort', () => archive.outputStream.destroy(), { once: true });
    for (const asset of session.assets) archive.addFile(assetPath(token, asset.filename), asset.filename, { compress: false });
    archive.end();
    return new Response(body, { headers: {
      ...privateHeaders, 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="photobooth.zip"'
    } });
  }
  const asset = session.assets.find(({ filename }) => filename === file);
  if (!asset) return failure('Không tìm thấy file.', 404);
  const source = assetPath(token, asset.filename);
  const disk = await stat(source).catch(() => null);
  if (!disk?.isFile() || disk.size !== Number(asset.bytes)) return failure('File không còn khả dụng.', 404);
  const headers = {
    ...privateHeaders,
    'Content-Type': contentType(file),
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `${new URL(request.url).searchParams.has('download') ? 'attachment' : 'inline'}; filename="${file}"`
  };
  const rangeHeader = request.headers.get('range');
  const range = rangeHeader ? rangeFor(rangeHeader, disk.size) : null;
  if (rangeHeader && !range) {
    return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${disk.size}` } });
  }
  headers['Content-Length'] = String(range ? range.end - range.start + 1 : disk.size);
  if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${disk.size}`;
  return new Response(Readable.toWeb(createReadStream(source, range || undefined)), { status: range ? 206 : 200, headers });
}
