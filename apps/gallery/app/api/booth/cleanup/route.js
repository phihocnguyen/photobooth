import { rm } from 'node:fs/promises';
import { query } from '../../../../lib/database.js';
import { apiEnabled } from '../../../../lib/deployment.js';
import { assetPath, authorized, failure, privateHeaders, validToken } from '../../../../lib/sessions.js';

export async function POST(request) {
  if (!apiEnabled()) return failure('Not found', 404);
  if (!authorized(request)) return failure('Unauthorized', 401);
  const { rows } = await query('SELECT token FROM booth_sessions WHERE expires_at <= now() LIMIT 100');
  let removed = 0;
  for (const { token } of rows) {
    if (!validToken(token)) continue;
    await rm(assetPath(token, ''), { recursive: true, force: true });
    await query('DELETE FROM booth_sessions WHERE token = $1 AND expires_at <= now()', [token]);
    removed++;
  }
  return Response.json({ removed }, { headers: privateHeaders });
}
