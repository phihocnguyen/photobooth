import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import pg from 'pg';

export const mediaRoot = path.resolve(/* turbopackIgnore: true */ process.env.GALLERY_MEDIA_DIR || '.gallery-data/media');
const schema = `
  CREATE TABLE IF NOT EXISTS booth_sessions (
    token text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    ready boolean NOT NULL DEFAULT false
  );
  CREATE INDEX IF NOT EXISTS booth_sessions_expiry ON booth_sessions (expires_at);
  CREATE TABLE IF NOT EXISTS booth_assets (
    token text NOT NULL REFERENCES booth_sessions(token) ON DELETE CASCADE,
    filename text NOT NULL,
    bytes bigint NOT NULL,
    PRIMARY KEY (token, filename)
  );
`;

async function connect() {
  let database;
  if (process.env.DATABASE_URL) {
    database = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  } else if (process.env.GALLERY_LOCAL_DB === '1' && process.env.NODE_ENV !== 'production') {
    const { PGlite } = await import('@electric-sql/pglite');
    const location = path.resolve('.gallery-data/database');
    await mkdir(path.dirname(location), { recursive: true });
    database = new PGlite(location);
  } else {
    throw new Error('Set DATABASE_URL, or enable GALLERY_LOCAL_DB=1 in development.');
  }
  try {
    if (database.exec) await database.exec(schema);
    else await database.query(schema);
    return database;
  } catch (error) {
    if (database.end) await database.end();
    else await database.close();
    throw error;
  }
}

export async function query(sql, values = []) {
  globalThis.photoboothGalleryDb ??= connect().catch((error) => {
    delete globalThis.photoboothGalleryDb;
    throw error;
  });
  return (await globalThis.photoboothGalleryDb).query(sql, values);
}
