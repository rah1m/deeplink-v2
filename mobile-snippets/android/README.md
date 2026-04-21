# Android integration

App Links (verified HTTPS deeplinks) open the app directly when installed and
fall through to the Play Store when not. Play Install Referrer delivers the
click ID on first launch so installs get attributed.

## 1. Declare the intent filter

`AndroidManifest.xml`:

```xml
<activity android:name=".DeeplinkActivity" android:exported="true">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="links.nar.az"
              android:pathPrefix="/l/" />
    </intent-filter>
</activity>
```

`autoVerify="true"` tells Android to fetch `assetlinks.json` from the domain and
skip the chooser dialog when verified.

## 2. Serve assetlinks.json

The backend serves it at
`https://links.nar.az/.well-known/assetlinks.json` — set
`ANDROID_PACKAGE_NAME` and `ANDROID_SHA256_FINGERPRINTS` in `.env`.

You can list multiple fingerprints (debug + release + Play App Signing) as a
comma-separated list.

Verify with:

```
adb shell pm verify-app-links --re-verify <package>
adb shell pm get-app-links <package>
```

## 3. Handle the incoming intent

Drop `DeeplinkHandler.kt` into your app. It reports an `open` event for every
incoming deep link.

## 4. Install attribution

Add Play Install Referrer to `build.gradle`:

```
implementation "com.android.installreferrer:installreferrer:2.2"
```

Call `DeeplinkHandler.reportInstallIfFirstLaunch(context)` from
`Application.onCreate()`. It pulls the `cid` out of the install referrer string
(the redirect page encodes `cid=...&slug=...`) and POSTs an `install` event.
