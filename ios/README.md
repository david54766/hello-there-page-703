# CallRecover iOS

Native SwiftUI starter for the CallRecover AI iPhone app.

This mirrors the Android app instead of wrapping the website in a WebView.

## What is wired

- Email/password sign-in through Supabase Auth.
- Secure token storage through iOS Keychain.
- Recent calls, business profile, scripts, agents, team members, appointments, and notifications through Supabase REST.
- Server-side mobile API calls for:
  - SMS sending
  - Recording URL lookup
  - Call forwarding status
  - Voice preview playback
  - Push token registration scaffolding
- Native SwiftUI screens for:
  - Sign in
  - Home/recovered revenue
  - Leads
  - Booking
  - Team
  - More/setup

## Mac setup

iOS apps must be built and signed on macOS with Xcode.

1. Install the latest Xcode from the Mac App Store.

2. Install XcodeGen:

   ```bash
   brew install xcodegen
   ```

3. Open this folder on the Mac:

   ```text
   work/callrecover-ios
   ```

4. Copy the config example:

   ```bash
   cp Config/CallRecover.xcconfig.example Config/CallRecover.xcconfig
   ```

5. Fill in:

   ```text
   SUPABASE_URL = https://czvsgemkmvkyfypearuj.supabase.co
   SUPABASE_ANON_KEY = YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   API_BASE_URL = https://callrecover.net
   ```

6. Generate the Xcode project:

   ```bash
   xcodegen generate
   ```

7. Open:

   ```text
   CallRecover.xcodeproj
   ```

8. In Xcode, set the Apple Developer Team on the CallRecover target.

9. Run on an iPhone simulator first, then a physical iPhone.

## Bundle ID

Current iOS bundle identifier:

```text
ai.easyfill.callrecover
```

This can still be changed before App Store Connect setup. Once the app is registered and uploaded, treat it as permanent.

## Backend note

The web app push-token endpoint and migration have been updated locally to allow `ios` push tokens:

```text
src/routes/api/mobile/push-token.ts
supabase/migrations/20260608090000_ios_push_tokens.sql
```

APNs/Firebase iOS push delivery is not fully wired yet. The iPhone app can be built and tested without push first.

## First test path

1. Generate the Xcode project.
2. Add config values.
3. Run the app.
4. Sign in with the same Supabase account used by Android.
5. Confirm:
   - Home loads business metrics.
   - Leads load and open.
   - Booking page loads appointments.
   - Team page loads team members.
   - More page loads readiness, scripts, business, and agent setup.

