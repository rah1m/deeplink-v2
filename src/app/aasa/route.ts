import { NextResponse } from "next/server";

// Served at https://<your-domain>/.well-known/apple-app-site-association (no extension).
// Apple fetches this to decide which URLs on this domain open the app directly.
// Note: iOS requires this response to be served as application/json over HTTPS.

export async function GET() {
  const teamId = process.env.IOS_APP_ID_PREFIX ?? "TEAMIDXXXX";
  const bundleId = process.env.IOS_BUNDLE_ID ?? "com.example.app";
  const appId = `${teamId}.${bundleId}`;

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          appIDs: [appId],
          paths: ["/l/*", "NOT /l/_*"],
          components: [{ "/": "/l/*", comment: "Marketing deep links" }],
        },
      ],
    },
    webcredentials: { apps: [appId] },
  };

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
