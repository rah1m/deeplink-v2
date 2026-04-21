# Deeplink Platform

A self-hosted deep-link platform for marketing campaigns. Marketers create
links in a web dashboard; links open the mobile app directly via Universal
Links (iOS) and App Links (Android), fall back to the store if the app isn't
installed, preserve UTM parameters, expire on a schedule, and optionally
shorten through Bitly. Click / open / install events stream back into the
dashboard.

## Stack

- **Next.js 14** App Router — API routes, redirect handler, and marketing
  dashboard in one app.
- **SQLite** via `better-sqlite3` — zero-ops persistence; swap for Postgres by
  replacing `src/lib/db.ts` when you need it.
- **Tailwind CSS** for the dashboard.
- **Native snippets** under `mobile-snippets/` that you paste into an existing
  iOS or Android app.

## Setup

```bash
cd deeplink-platform
npm install
cp .env.example .env.local   # edit values
npm run seed                 # creates the first admin from SEED_ADMIN_*
npm run dev                  # http://localhost:3000
```

Sign in with the seeded admin credentials and click **New link**.

## How it works

### Link creation (marketing team)

1. Marketer logs into `/links`, fills in name, destination path, UTM values,
   and expiry date.
2. Backend generates a short slug and persists the link. If the **Shorten with
   Bitly** checkbox is on and `BITLY_TOKEN` is set, it also stores a `bit.ly`
   alias.
3. The share URL looks like `https://links.nar.az/l/ab1c2d3` — this is both
   the Universal Link and the App Link.

### Click → app open (user taps the link)

The redirect handler at `src/app/l/[slug]/route.ts`:

1. Loads the link, rejects if expired.
2. Records a `click` event with a fresh `cid` (per-click identifier).
3. Builds the destination URL with UTMs merged in (plus the `cid`).
4. Detects platform from `user-agent`:
   - **iOS**: 302 redirect to the https destination. If the app is installed,
     the AASA file served at `/.well-known/apple-app-site-association` tells
     iOS to open it directly — no browser flash.
   - **Android**: HTML page that tries the verified App Link first, then
     falls through to an `intent://` URL with the Play Store as
     `browser_fallback_url`. The fallback URL includes
     `referrer=cid=…&slug=…` for Install Referrer attribution.
   - **Desktop / other**: plain 302 to the destination URL.

### Open / install attribution (mobile side)

The app calls `POST /api/events` with `{ kind, cid?, slug?, platform }`.

- **iOS**: paste `DeeplinkHandler.swift` from `mobile-snippets/ios/`. It
  handles `NSUserActivity` and reports `open` and `install` events. Install
  attribution uses a clipboard fallback since iOS doesn't expose the click
  referrer.
- **Android**: paste `DeeplinkHandler.kt` from `mobile-snippets/android/`.
  It handles the incoming intent and uses Play Install Referrer to pull the
  `cid` out of the Play Store URL on first launch.

Both snippets assume your backend is reachable at the HTTPS origin in
`baseURL` / `baseUrl`.

## URLs

| Path | Purpose |
|------|---------|
| `/` | Redirects to `/login` or `/links`. |
| `/login` | Marketing team sign-in. |
| `/links` | List links with click/open/install counts. |
| `/links/new` | Create a link (UTM fields, expiry, Bitly toggle). |
| `/links/:id` | Link detail + metrics breakdown + recent events. |
| `/l/:slug` | Public redirect handler — platform-aware. |
| `/api/auth/login` / `/api/auth/logout` | Session auth. |
| `/api/links` / `/api/links/:id` | Programmatic link CRUD (cookie-authed). |
| `/api/events` | Public endpoint for mobile SDKs to post `open` / `install`. |
| `/.well-known/apple-app-site-association` | AASA for Universal Links. |
| `/.well-known/assetlinks.json` | Digital Asset Links for App Links. |

## Environment

See `.env.example`. Key vars:

- `APP_BASE_URL` — public HTTPS origin (e.g. `https://links.nar.az`).
- `IOS_APP_ID_PREFIX`, `IOS_BUNDLE_ID` — used in AASA.
- `ANDROID_PACKAGE_NAME`, `ANDROID_SHA256_FINGERPRINTS` — used in
  `assetlinks.json`. Multiple fingerprints are comma-separated.
- `IOS_STORE_URL`, `ANDROID_STORE_PACKAGE` — store fallbacks.
- `BITLY_TOKEN`, `BITLY_DOMAIN` — optional shortening.
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` — used by `npm run seed`.

## Production checklist

- [ ] Put the app behind HTTPS (Universal Links and App Links won't work over
      plain HTTP).
- [ ] Point your domain at the app and verify `/.well-known/*` with Apple's
      and Google's validators.
- [ ] Swap SQLite for Postgres in `src/lib/db.ts` if you expect &gt;~100
      clicks/sec.
- [ ] Rotate `SESSION_SECRET` and enable `secure` cookies (already enabled in
      production builds).
- [ ] Hook the `/api/events` endpoint to your real analytics pipeline if you
      want retention / cohort analysis beyond the built-in counts.

## Notes

- iOS install attribution without a paid MMP is best-effort. The clipboard
  fallback in the Swift snippet works but users have to tap through to the
  App Store within a short window. For stricter attribution, integrate
  AdServices / SKAdNetwork or a vendor.
- The Android redirect page does the App Link → intent fallback in JS so
  installed apps still get the silent handoff when the domain isn't verified
  (e.g. before `autoVerify` has succeeded).
