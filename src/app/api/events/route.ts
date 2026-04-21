import { NextResponse } from "next/server";
import { z } from "zod";
import { findClickByCid, recordEvent } from "@/lib/events";
import { getLinkBySlug } from "@/lib/links";

// Public endpoint called by the mobile apps (or an SDK you ship with them)
// after a deeplink is handled.
//
//   kind=open     -> fired every time the app handles a deep link
//   kind=install  -> fired once on first launch after install, with the cid
//                    captured from Play Install Referrer (Android) or the
//                    clipboard/PCM fallback (iOS)
//
// A `cid` lets us attribute the event back to a specific click. If `cid` is
// missing we fall back to slug-based attribution (still useful for aggregate
// metrics, just not per-click).

const schema = z.object({
  kind: z.enum(["open", "install"]),
  cid: z.string().optional(),
  slug: z.string().optional(),
  platform: z.enum(["ios", "android", "other"]).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let linkId: number | null = null;
  if (parsed.data.cid) {
    const byClick = findClickByCid(parsed.data.cid);
    if (byClick) linkId = byClick.link_id;
  }
  if (!linkId && parsed.data.slug) {
    const link = getLinkBySlug(parsed.data.slug);
    if (link) linkId = link.id;
  }
  if (!linkId) {
    return NextResponse.json(
      { error: "Could not resolve cid or slug to a link" },
      { status: 404 }
    );
  }

  recordEvent({
    linkId,
    kind: parsed.data.kind,
    cid: parsed.data.cid ?? null,
    platform: parsed.data.platform ?? null,
    userAgent: req.headers.get("user-agent"),
    referrer: req.headers.get("referer"),
    ip:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null,
  });

  return NextResponse.json({ ok: true });
}
