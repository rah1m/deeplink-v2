# iOS integration

Universal Links open the app directly when it's installed and fall through to
Safari (which redirects to the App Store) when it isn't.

## 1. Add the Associated Domains entitlement

In Xcode: **Signing & Capabilities → + Capability → Associated Domains**.

Add an entry per environment:

```
applinks:links.nar.az
applinks:staging.links.nar.az
```

## 2. Serve the AASA file

The backend already serves it at
`https://links.nar.az/.well-known/apple-app-site-association`.

Set `IOS_APP_ID_PREFIX` (your 10-char Team ID) and `IOS_BUNDLE_ID` in `.env` —
the route uses them to compose the `appID`.

Verify with Apple's validator:
<https://search.developer.apple.com/appsearch-validation-tool/>

## 3. Handle the incoming link

Drop `DeeplinkHandler.swift` into your app and wire it up from the
`SceneDelegate` (or the `onOpenURL` / `onContinueUserActivity` modifiers if you
use SwiftUI).

## 4. Install attribution (optional)

iOS doesn't expose the click referrer on install. Two workable options:

- **Clipboard fallback**: when the user taps a deep link on the web, copy the
  `cid` to the clipboard, then read it once on first launch.
- **Apple Private Click Measurement**: use `SKAdNetwork` postbacks with a custom
  attribution server.

For the clipboard fallback, the included `DeeplinkHandler.reportInstallIfFirstLaunch()`
reads `UIPasteboard` once and POSTs to `/api/events`.
