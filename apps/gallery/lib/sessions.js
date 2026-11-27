import path from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
import { mediaRoot, query } from './database.js';

export const validToken = (token) => /^[A-Za-z0-9_-]{32}$/.test(token);
export const isOriginal = (name) => /^original-(0[1-9]|[1-9][0-9])\.jpg$/.test(name);
export const validFilename = (name) => isOriginal(name) || name === 'photobooth.jpg' || name === 'video.mp4';
export const assetPath = (token, file) => path.join(mediaRoot, token, file);
export const contentType = (name) => name.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
export const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const digest = (value) => createHash('sha256').update(value).digest();

export function authorized(request) {
  const key = process.env.GALLERY_UPLOAD_KEY;
  return Boolean(key) && timingSafeEqual(digest(request.headers.get('authorization') || ''), digest(`Bearer ${key}`));
}

export function failure(message, status) {
  return Response.json({ error: message }, { status, headers: privateHeaders });
}

export async function findSession(token) {
  if (!validToken(token)) return null;
  const { rows } = await query('SELECT * FROM booth_sessions WHERE token = $1', [token]);
  const session = rows[0];
  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) return { expired: true };
  const { rows: assets } = await query('SELECT filename, bytes FROM booth_assets WHERE token = $1 ORDER BY filename', [token]);
  return { ...session, assets };
}

export function albumMetadata(session) {
  const files = session.assets.map(({ filename }) => filename);
  return {
    createdAt: new Date(session.created_at).toISOString(),
    expiresAt: new Date(session.expires_at).toISOString(),
    ready: session.ready,
    originalCount: files.filter(isOriginal).length,
    files: session.ready ? files : []
  };
}
