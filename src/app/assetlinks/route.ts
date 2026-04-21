import { NextResponse } from "next/server";

// Served at https://<your-domain>/.well-known/assetlinks.json
// Android fetches this to verify App Links for your package/fingerprint.

export async function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME ?? "com.example.app";
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: pkg,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
