import { ensureSchema, sql } from "./db";
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
  await ensureSchema();

  let slug = makeSlug();
  while (
    ((await sql`SELECT 1 FROM links WHERE slug = ${slug}`) as unknown[]).length > 0
  ) {
    slug = makeSlug();
  }

  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const publicUrl = `${base}/l/${slug}`;
  const shortUrl = input.useBitly ? await shortenWithBitly(publicUrl) : null;

  const rows = (await sql`
    INSERT INTO links
      (slug, name, destination_path, utm_source, utm_medium, utm_campaign,
       utm_term, utm_content, expires_at, short_url, created_by)
    VALUES (
      ${slug},
      ${input.name},
      ${input.destinationPath},
      ${input.utmSource ?? null},
      ${input.utmMedium ?? null},
      ${input.utmCampaign ?? null},
      ${input.utmTerm ?? null},
      ${input.utmContent ?? null},
      ${input.expiresAt ?? null},
      ${shortUrl},
      ${input.createdBy}
    )
    RETURNING *
  `) as LinkRow[];

  return rows[0];
}

export async function getLinkBySlug(slug: string): Promise<LinkRow | null> {
  await ensureSchema();
  const rows = (await sql`SELECT * FROM links WHERE slug = ${slug}`) as LinkRow[];
  return rows[0] ?? null;
}

export async function getLinkById(id: number): Promise<LinkRow | null> {
  await ensureSchema();
  const rows = (await sql`SELECT * FROM links WHERE id = ${id}`) as LinkRow[];
  return rows[0] ?? null;
}

export type LinkWithMetrics = LinkRow & {
  clicks: number;
  opens: number;
  installs: number;
};

export async function listLinksWithMetrics(): Promise<LinkWithMetrics[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT l.*,
      COALESCE(SUM(CASE WHEN e.kind='click' THEN 1 ELSE 0 END), 0)::int AS clicks,
      COALESCE(SUM(CASE WHEN e.kind='open' THEN 1 ELSE 0 END), 0)::int AS opens,
      COALESCE(SUM(CASE WHEN e.kind='install' THEN 1 ELSE 0 END), 0)::int AS installs
    FROM links l
    LEFT JOIN events e ON e.link_id = l.id
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `) as LinkWithMetrics[];
  return rows;
}

export async function getLinkMetrics(linkId: number) {
  await ensureSchema();

  const totalsRows = (await sql`
    SELECT
      COALESCE(SUM(CASE WHEN kind='click' THEN 1 ELSE 0 END), 0)::int AS clicks,
      COALESCE(SUM(CASE WHEN kind='open' THEN 1 ELSE 0 END), 0)::int AS opens,
      COALESCE(SUM(CASE WHEN kind='install' THEN 1 ELSE 0 END), 0)::int AS installs
    FROM events WHERE link_id = ${linkId}
  `) as { clicks: number; opens: number; installs: number }[];
  const totals = totalsRows[0] ?? { clicks: 0, opens: 0, installs: 0 };

  const byPlatform = (await sql`
    SELECT platform, kind, COUNT(*)::int AS n
    FROM events WHERE link_id = ${linkId}
    GROUP BY platform, kind
  `) as { platform: string | null; kind: string; n: number }[];

  const recent = (await sql`
    SELECT id, kind, platform, user_agent, referrer, created_at
    FROM events WHERE link_id = ${linkId}
    ORDER BY created_at DESC LIMIT 20
  `) as {
    id: number;
    kind: string;
    platform: string | null;
    user_agent: string | null;
    referrer: string | null;
    created_at: string;
  }[];

  return { totals, byPlatform, recent };
}

export async function expireLink(id: number): Promise<void> {
  await ensureSchema();
  const now = new Date().toISOString();
  await sql`UPDATE links SET expires_at = ${now} WHERE id = ${id}`;
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
