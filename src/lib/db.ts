import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local for local dev or to Vercel → Settings → Environment Variables."
  );
}

export const sql = neon(connectionString);

declare global {
  // eslint-disable-next-line no-var
  var __dlSchemaReady: Promise<void> | undefined;
}

export function ensureSchema(): Promise<void> {
  if (!globalThis.__dlSchemaReady) globalThis.__dlSchemaReady = migrate();
  return globalThis.__dlSchemaReady;
}

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS links (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      destination_path TEXT NOT NULL,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_term TEXT,
      utm_content TEXT,
      expires_at TEXT,
      short_url TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug)`;

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('click','open','install')),
      cid TEXT,
      platform TEXT,
      user_agent TEXT,
      referrer TEXT,
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_events_link ON events(link_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_cid ON events(cid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind)`;
}
