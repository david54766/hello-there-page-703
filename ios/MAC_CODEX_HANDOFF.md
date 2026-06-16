# CallRecover iOS Mac Codex Handoff

You are Codex running on the user's Mac. Continue the CallRecover iPhone app from this folder.

## Goal

Build, fix, run, and prepare the native iOS version of CallRecover AI.

The Android version is mostly complete. The iOS project in this folder is a first-pass SwiftUI implementation that mirrors the Android app.

## Current Project

Folder:

```text
work/callrecover-ios
```

Bundle ID:

```text
ai.easyfill.callrecover
```

Important files:

```text
CallRecover/CallRecoverApp.swift
CallRecover/Models/Models.swift
CallRecover/Services/CallRecoverAPI.swift
CallRecover/Services/SessionStore.swift
CallRecover/ViewModels/AppViewModel.swift
CallRecover/Views/*.swift
CallRecover/Assets.xcassets/AppIcon.appiconset
project.yml
README.md
```

## Backend

Supabase project:

```text
CallRecover Production
Project ref: czvsgemkmvkyfypearuj
SUPABASE_URL = https://czvsgemkmvkyfypearuj.supabase.co
API_BASE_URL = https://callrecover.net
```

The mobile app uses:

```text
Supabase Auth password grant
Supabase REST /rest/v1/*
POST /api/mobile/send-sms
POST /api/mobile/recording-url
GET /api/mobile/forwarding-status
POST /api/mobile/forwarding-status
POST /api/mobile/push-token
POST /api/mobile/voice-preview
```

The backend was updated locally and migrated so push tokens accept `ios`:

```text
hello-there-page-703-main/src/routes/api/mobile/push-token.ts
hello-there-page-703-main/supabase/migrations/20260608090000_ios_push_tokens.sql
```

Migration was already applied to Supabase project `czvsgemkmvkyfypearuj`.

## First Mac Tasks

1. Install/open Xcode and accept license/components.

2. Install XcodeGen:

```bash
brew install xcodegen
```

If Homebrew is missing:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install xcodegen
```

3. Create local config:

```bash
cp Config/CallRecover.xcconfig.example Config/CallRecover.xcconfig
```

Fill in:

```text
SUPABASE_URL = https://czvsgemkmvkyfypearuj.supabase.co
SUPABASE_ANON_KEY = <use the same publishable key from Android local.properties or Supabase>
API_BASE_URL = https://callrecover.net
```

4. Generate the Xcode project:

```bash
xcodegen generate
```

5. Open:

```bash
open CallRecover.xcodeproj
```

6. Build:

```bash
xcodebuild -project CallRecover.xcodeproj -scheme CallRecover -destination 'platform=iOS Simulator,name=iPhone 16' build
```

If needed:

```bash
xcrun simctl list devices available
```

## Expected Fixes

This project was authored on Windows, so expect Swift compile fixes. Prioritize:

- Codable key mapping correctness for Supabase snake_case fields.
- Optional/default model initializers.
- SwiftUI binding correctness.
- Sheet and NavigationStack compile issues.
- Voice preview playback through `AVAudioPlayer`.
- URL encoding for Supabase query params.
- iOS-safe token storage through Keychain.

Do not switch to a WebView unless the user explicitly requests it.

## Verification

After build succeeds:

1. Run in simulator.
2. Sign in with the same test account used in Android.
3. Verify:
   - Home loads recovered calls/revenue.
   - Leads load and detail sheet opens.
   - SMS send route calls server without client-side Twilio secrets.
   - Booking page loads appointments.
   - Team page loads team members.
   - More page shows readiness/business/agent/scripts.
   - Voice preview plays unique voice audio from `/api/mobile/voice-preview`.

## Not Finished Yet

- APNs push notification entitlement/certificate setup.
- TestFlight/App Store Connect setup.
- In-app purchases/StoreKit.
- Full visual polish after first simulator screenshots.
- Xcode signing/team configuration.

## User Preference

User wants the app to feel premium, sleek, and AI-forward:

- Smooth cards
- Light AI-themed background
- Violet/cyan/teal theme
- Minimal top clutter
- Native high-quality UX
- No redundant legal/footer text inside the app unless compliance requires it

## Report Back

When finished, provide:

- Build status
- Simulator status
- Any screenshots if possible
- Remaining blockers
- Exact next action for TestFlight or App Store Connect

