# CallRecover Android

Native Android starter for the CallRecover mobile app.

## What is wired

- Email/password sign-in through Supabase Auth.
- Recent call list from Supabase REST using the signed-in user's RLS context.
- Call detail with summary, transcript, and SMS thread display.
- Outbound SMS through `/api/mobile/send-sms`, so Twilio and consent checks stay server-side.
- Call forwarding helper that opens the Android dialer and records forwarding setup status.
- Firebase Messaging service stub that registers refreshed Android push tokens with `/api/mobile/push-token`.

## Local setup

This machine now has Android Studio, Android SDK Platform 36, Build Tools 36, Android Emulator, and a local Gradle 9.1.0 install available under:

- `C:\Program Files\Android\Android Studio`
- `C:\Users\belad\AppData\Local\Android\Sdk`
- `C:\Users\belad\Documents\Codex\2026-06-01\ok-i-want-to-make-an\work\tools\gradle-9.1.0`

1. Install Android Studio with:
   - Android SDK Platform 36
   - Android SDK Build-Tools
   - JDK 17 or newer

2. Open this folder in Android Studio:

   `C:\Users\belad\Documents\Codex\2026-06-01\ok-i-want-to-make-an\work\callrecover-android`

3. Copy `local.properties.example` to `local.properties`.

4. Fill in:

   ```properties
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   API_BASE_URL=https://callrecover.net
   ```

5. Sync Gradle.

6. Run the `app` configuration on an emulator or Android phone.

From PowerShell, this project can be built with:

```powershell
.\build-debug.ps1
```

The debug APK is generated at:

`app\build\outputs\apk\debug\app-debug.apk`

## Push notifications

Firebase push is scaffolded but not fully enabled until Firebase is connected:

1. Create or select a Firebase project.
2. Add Android app package `ai.easyfill.callrecover`.
3. Download `google-services.json`.
4. Place it in `app/google-services.json`.
5. Add the Google Services Gradle plugin when ready.

Until that file exists, keep push work as a later integration step.

## Backend dependency

The mobile app expects these web app changes to be deployed:

- `POST /api/mobile/send-sms`
- `POST /api/mobile/recording-url`
- `GET /api/mobile/forwarding-status`
- `POST /api/mobile/forwarding-status`
- `POST /api/mobile/push-token`
- `DELETE /api/mobile/push-token`

The matching migration is in the Lovable app:

`C:\Users\belad\Documents\Codex\2026-06-01\ok-i-want-to-make-an\work\hello-there-page-703-main\supabase\migrations\20260602090000_mobile_app_support.sql`

## First test path

1. Deploy the mobile API routes and migration.
2. Open the Android app and sign in.
3. Confirm recent calls load.
4. Open one call and confirm transcript/messages load.
5. Send one SMS from the app.
6. Open forwarding, enter the forwarding number, tap `Open dialer`, then confirm the status updates.
