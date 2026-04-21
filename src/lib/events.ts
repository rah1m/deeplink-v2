import { getDb } from "./db";

export type EventKind = "click" | "open" | "install";

export function recordEvent(params: {
  linkId: number;
  kind: EventKind;
  cid?: string | null;
  platform?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  ip?: string | null;
}) {
  getDb()
    .prepare(
      `INSERT INTO events (link_id, kind, cid, platform, user_agent, referrer, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      params.linkId,
      params.kind,
      params.cid ?? null,
      params.platform ?? null,
      params.userAgent ?? null,
      params.referrer ?? null,
      params.ip ?? null
    );
}

export function findClickByCid(cid: string): { link_id: number } | null {
  return (
    (getDb()
      .prepare(
        `SELECT link_id FROM events WHERE cid = ? AND kind = 'click'
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(cid) as { link_id: number } | undefined) ?? null
  );
}
