import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { recordEvent } from "@/lib/events";
import { buildDestinationUrl, getLinkBySlug, isExpired } from "@/lib/links";
import { detectPlatform } from "@/lib/ua";

// How the redirect behaves per platform:
// iOS:     We return a 302 to the Universal Link (our own https URL pointing at the
//          app's registered path). With a valid AASA file, iOS opens the app directly
//          without the browser flashing. If the app isn't installed, we fall through
//          to the App Store after a short JS delay.
// Android: We return an HTML page that fires an `intent://` URL. If the app is
//          installed, the App Link takes over and opens it. If not, the intent
//          fallback sends the user to the Play Store with the click id (cid) encoded
//          in the install_referrer so the app can attribute the install on first run.
// Desktop/other: Plain 302 to the destination URL with UTMs appended.

export async function GET(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const link = await getLinkBySlug(params.slug);
  if (!link) {
    return new NextResponse("Link not found", { status: 404 });
  }
  if (isExpired(link)) {
    return new NextResponse("This link has expired.", { status: 410 });
  }

  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent");
  const referrer = req.headers.get("referer");
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const platform = detectPlatform(userAgent);

  const cid = nanoid(12);
  await recordEvent({
    linkId: link.id,
    kind: "click",
    cid,
    platform,
    userAgent,
    referrer,
    ip,
  });

  // Preserve any extra query params the marketer appended to the short link.
  const extra = new URLSearchParams();
  for (const [k, v] of url.searchParams.entries()) extra.set(k, v);
  extra.set("cid", cid);

  const destinationUrl = buildDestinationUrl(link, extra);

  if (platform === "ios") {
    return NextResponse.redirect(destinationUrl, { status: 302 });
  }

  if (platform === "android") {
    return new NextResponse(androidIntentHtml(link.slug, destinationUrl, cid), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.redirect(destinationUrl, { status: 302 });
}

function androidIntentHtml(
  slug: string,
  httpsUrl: string,
  cid: string,
): string {
  const pkg =
    process.env.ANDROID_STORE_PACKAGE ?? process.env.ANDROID_PACKAGE_NAME ?? "";
  const parsed = new URL(httpsUrl);
  const intentUrl =
    `intent://${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}` +
    `#Intent;scheme=https;package=${pkg};` +
    `S.browser_fallback_url=${encodeURIComponent(
      `https://play.google.com/store/apps/details?id=${pkg}` +
        `&referrer=${encodeURIComponent(`cid=${cid}&slug=${slug}`)}`,
    )};end`;

  return `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Opening app…</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;margin:0;padding:2rem;background:#0b0b0c;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh}main{max-width:22rem;text-align:center}a{color:#7ab7ff}</style>
</head><body>
<main>
  <h1>Opening app…</h1>
  <p>If nothing happens in a few seconds, <a id="fallback" href="${httpsUrl}">tap here</a>.</p>
</main>
<script>
  (function(){
    var intent = ${JSON.stringify(intentUrl)};
    // Prefer the declared App Link URL so verified domains bypass the disambiguation dialog.
    window.location.replace(${JSON.stringify(httpsUrl)});
    setTimeout(function(){ window.location.replace(intent); }, 400);
  })();
</script>
</body></html>`;
}
