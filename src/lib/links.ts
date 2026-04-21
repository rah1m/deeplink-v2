import { getDb } from "./db";
import { makeSlug } from "./slug";
import { shortenWithBitly } from "./bitly";

export type LinkRow = {
  id: number;
  slug: string;
  name: string;
  destination_path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  expires_at: string | null;
  short_url: string | null;
  created_by: number | null;
  created_at: string;
};

export type CreateLinkInput = {
  name: string;
  destinationPath: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  expiresAt?: string | null;
  useBitly?: boolean;
  createdBy: number;
};

export async function createLink(input: CreateLinkInput): Promise<LinkRow> {
  const db = getDb();
  let slug = makeSlug();
  while (db.prepare("SELECT 1 FROM links WHERE slug = ?").get(slug)) slug = makeSlug();

  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const publicUrl = `${base}/l/${slug}`;
  const shortUrl = input.useBitly ? await shortenWithBitly(publicUrl) : null;

  const info = db
    .prepare(
      `INSERT INTO links
        (slug, name, destination_path, utm_source, utm_medium, utm_campaign,
         utm_term, utm_content, expires_at, short_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      slug,
      input.name,
      input.destinationPath,
      input.utmSource ?? null,
      input.utmMedium ?? null,
      input.utmCampaign ?? null,
      input.utmTerm ?? null,
      input.utmContent ?? null,
      input.expiresAt ?? null,
      shortUrl,
      input.createdBy
    );

  return db
    .prepare("SELECT * FROM links WHERE id = ?")
    .get(info.lastInsertRowid) as LinkRow;
}

export function getLinkBySlug(slug: string): LinkRow | null {
  return (
    (getDb().prepare("SELECT * FROM links WHERE slug = ?").get(slug) as LinkRow) ?? null
  );
}

export function getLinkById(id: number): LinkRow | null {
  return (
    (getDb().prepare("SELECT * FROM links WHERE id = ?").get(id) as LinkRow) ?? null
  );
}

export type LinkWithMetrics = LinkRow & {
  clicks: number;
  opens: number;
  installs: number;
};

export function listLinksWithMetrics(): LinkWithMetrics[] {
  return getDb()
    .prepare(
      `SELECT l.*,
         COALESCE(SUM(CASE WHEN e.kind='click' THEN 1 ELSE 0 END), 0) AS clicks,
         COALESCE(SUM(CASE WHEN e.kind='open' THEN 1 ELSE 0 END), 0) AS opens,
         COALESCE(SUM(CASE WHEN e.kind='install' THEN 1 ELSE 0 END), 0) AS installs
       FROM links l
       LEFT JOIN events e ON e.link_id = l.id
       GROUP BY l.id
       ORDER BY l.created_at DESC`
    )
    .all() as LinkWithMetrics[];
}

export function getLinkMetrics(linkId: number) {
  const db = getDb();
  const totals = db
    .prepare(
      `SELECT
         SUM(CASE WHEN kind='click' THEN 1 ELSE 0 END) AS clicks,
         SUM(CASE WHEN kind='open' THEN 1 ELSE 0 END) AS opens,
         SUM(CASE WHEN kind='install' THEN 1 ELSE 0 END) AS installs
       FROM events WHERE link_id = ?`
    )
    .get(linkId) as { clicks: number; opens: number; installs: number };

  const byPlatform = db
    .prepare(
      `SELECT platform, kind, COUNT(*) AS n
       FROM events WHERE link_id = ?
       GROUP BY platform, kind`
    )
    .all(linkId) as { platform: string | null; kind: string; n: number }[];

  const recent = db
    .prepare(
      `SELECT id, kind, platform, user_agent, referrer, created_at
       FROM events WHERE link_id = ?
       ORDER BY created_at DESC LIMIT 20`
    )
    .all(linkId);

  return {
    totals: {
      clicks: totals?.clicks ?? 0,
      opens: totals?.opens ?? 0,
      installs: totals?.installs ?? 0,
    },
    byPlatform,
    recent,
  };
}

export function expireLink(id: number) {
  getDb()
    .prepare("UPDATE links SET expires_at = datetime('now') WHERE id = ?")
    .run(id);
}

export function isExpired(link: LinkRow): boolean {
  if (!link.expires_at) return false;
  return new Date(link.expires_at).getTime() <= Date.now();
}

export function buildDestinationUrl(link: LinkRow, extra?: URLSearchParams): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const url = link.destination_path.startsWith("http")
    ? new URL(link.destination_path)
    : new URL(
        `${link.destination_path.startsWith("/") ? "" : "/"}${link.destination_path}`,
        base
      );

  const utms: Record<string, string | null> = {
    utm_source: link.utm_source,
    utm_medium: link.utm_medium,
    utm_campaign: link.utm_campaign,
    utm_term: link.utm_term,
    utm_content: link.utm_content,
  };
  for (const [k, v] of Object.entries(utms)) {
    if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
  }
  if (extra) {
    for (const [k, v] of extra.entries()) {
      if (!url.searchParams.has(k)) url.searchParams.set(k, v);
    }
  }
  return url.toString();
}
