export function apiEnabled() {
  return process.env.GALLERY_ROLE !== 'web' && process.env.VERCEL !== '1';
}

export function externalApiBase() {
  const value = process.env.GALLERY_API_URL?.trim();
  if (!value) return null;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('GALLERY_API_URL must be an HTTP(S) base URL.');
  }
  return url.href.replace(/\/+$/, '');
}
