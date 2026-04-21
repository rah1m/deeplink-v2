import { ensureSchema, sql } from "./db";

export type EventKind = "click" | "open" | "install";

export async function recordEvent(params: {
  linkId: number;
  kind: EventKind;
  cid?: string | null;
  platform?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  ip?: string | null;
}): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO events (link_id, kind, cid, platform, user_agent, referrer, ip)
    VALUES (
      ${params.linkId},
      ${params.kind},
      ${params.cid ?? null},
      ${params.platform ?? null},
      ${params.userAgent ?? null},
      ${params.referrer ?? null},
      ${params.ip ?? null}
    )
  `;
}

export async function findClickByCid(
  cid: string
): Promise<{ link_id: number } | null> {
  await ensureSchema();
  const rows = (await sql`
    SELECT link_id FROM events
    WHERE cid = ${cid} AND kind = 'click'
    ORDER BY created_at DESC LIMIT 1
  `) as { link_id: number }[];
  return rows[0] ?? null;
}
