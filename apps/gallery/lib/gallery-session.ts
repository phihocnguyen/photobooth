import { apiEnabled, externalApiBase } from './deployment.js';
import { isOriginal, validFilename, validToken } from './sessions.js';

type Album = {
  createdAt: string;
  expiresAt: string;
  ready: boolean;
  originalCount: number;
  files: string[];
};

export async function loadAlbum(token: string): Promise<{
  apiBase: string;
  state: 'missing' | 'expired' | 'unavailable' | 'found';
  album?: Album;
}> {
  const apiBase = externalApiBase() || '';
  if (!validToken(token)) return { apiBase, state: 'missing' };
  if (!apiBase && !apiEnabled()) return { apiBase, state: 'unavailable' };
  if (!apiBase) {
    const { albumMetadata, findSession } = await import('./sessions.js');
    const session = await findSession(token);
    if (!session) return { apiBase, state: 'missing' };
    if (session.expired) return { apiBase, state: 'expired' };
    return { apiBase, state: 'found', album: albumMetadata(session) };
  }

  try {
    const response = await fetch(`${apiBase}/api/session/${token}`, {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000)
    });
    if (response.status === 404) return { apiBase, state: 'missing' };
    if (response.status === 410) return { apiBase, state: 'expired' };
    if (!response.ok) return { apiBase, state: 'unavailable' };
    const data: Album = await response.json();
    if (typeof data.ready !== 'boolean' || !Number.isInteger(data.originalCount) || data.originalCount < 0 ||
        !Number.isFinite(Date.parse(data.createdAt)) || !Number.isFinite(Date.parse(data.expiresAt)) ||
        !Array.isArray(data.files) || !data.files.every(validFilename) ||
        (data.ready && (!data.files.includes('photobooth.jpg') || data.originalCount !== data.files.filter(isOriginal).length))) {
      return { apiBase, state: 'unavailable' };
    }
    return { apiBase, state: 'found', album: data };
  } catch {
    return { apiBase, state: 'unavailable' };
  }
}
