import { apiEnabled } from '../../../../lib/deployment.js';
import { albumMetadata, failure, findSession, privateHeaders } from '../../../../lib/sessions.js';

export const runtime = 'nodejs';

export async function GET(_request, { params }) {
  if (!apiEnabled()) return failure('Not found', 404);
  const { token } = await params;
  const session = await findSession(token);
  if (!session) return failure('Session not found', 404);
  if (session.expired) return failure('Session expired', 410);
  return Response.json(albumMetadata(session), { headers: privateHeaders });
}
