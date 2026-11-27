import { fileURLToPath } from 'node:url';

export default {
  agentRules: false,
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  serverExternalPackages: ['@electric-sql/pglite', 'pg', 'yazl'],
  async headers() {
    return [{
      source: '/session/:path*',
      headers: [
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }
      ]
    }];
  }
};
