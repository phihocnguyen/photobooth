import { query } from '../../../../lib/database.js';
import { apiEnabled } from '../../../../lib/deployment.js';
import { authorized, failure, findSession, privateHeaders, validFilename, validToken } from '../../../../lib/sessions.js';

export const runtime = 'nodejs';

export async function PUT(request, { params }) {
  if (!apiEnabled()) return failure('Not found', 404);
  if (!authorized(request)) return failure('Unauthorized', 401);
  const { token } = await params;
  if (!validToken(token)) return failure('Invalid session', 400);
  const days = Number(process.env.GALLERY_RETENTION_DAYS || 30);
  if (!Number.isInteger(days) || days < 1 || days > 3650) return failure('Invalid retention configuration', 500);
  const now = Date.now();
  const captureTime = request.headers.get('x-capture-time');
  const created = captureTime ? Date.parse(captureTime) : now;
  if (!Number.isFinite(created) || created > now + 300_000) return failure('Invalid capture time', 400);
  if (created + days * 86_400_000 <= now) return failure('Session expired', 410);
  const expires = new Date(created + days * 86_400_000).toISOString();
  await query('INSERT INTO booth_sessions (token, created_at, expires_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [token, new Date(created).toISOString(), expires]);
  const session = await findSession(token);
  return session?.expired ? failure('Session expired', 410) : new Response(null, { status: 204, headers: privateHeaders });
}

export async function POST(request, { params }) {
  if (!apiEnabled()) return failure('Not found', 404);
  if (!authorized(request)) return failure('Unauthorized', 401);
  const { token } = await params;
  const session = await findSession(token);
  if (!session || session.expired) return failure('Session unavailable', session?.expired ? 410 : 404);
  const raw = await request.text();
  if (raw.length > 4096) return failure('Manifest too large', 413);
  let files;
  try { ({ files } = JSON.parse(raw)); } catch { return failure('Invalid manifest', 400); }
  if (!Array.isArray(files) || files.length > 101 ||
      !files.includes('photobooth.jpg') || !files.some((file) => /^original-/.test(file)) ||
      files.some((file) => typeof file !== 'string' || !validFilename(file)) || new Set(files).size !== files.length) {
    return failure('Invalid manifest', 400);
  }
  const present = new Set(session.assets.map((asset) => asset.filename));
  if (present.size !== files.length || files.some((file) => !present.has(file))) return failure('Assets incomplete', 409);
  await query('UPDATE booth_sessions SET ready = true WHERE token = $1', [token]);
  return new Response(null, { status: 204, headers: privateHeaders });
}
