# CallRecover

This repository is the source of truth for CallRecover only.

- Web / Lovable app: repository root
- Android native app: `android/`
- iOS native app: `ios/`
- Production domain: `https://callrecover.net`
- Supabase production project: `czvsgemkmvkyfypearuj`

Prima Donna AI lives in a separate repository and should not be mixed into this codebase.

## Web App

The web app is a TanStack Start / React application generated through Lovable.

```powershell
npm install
npm run build
```

Secrets are managed in Lovable/hosting. Do not commit `.env` files or service keys.

## Android

Open `android/` in Android Studio.

Local setup files are intentionally ignored:

- `android/local.properties`
- `android/keystore.properties`
- `android/app/google-services.json`
- Android signing keys

Use the example files in `android/` as templates.

## iOS

Open `ios/` on macOS.

```bash
cd ios
cp Config/CallRecover.xcconfig.example Config/CallRecover.xcconfig
xcodegen generate
open CallRecover.xcodeproj
```

The real xcconfig and local Xcode build output are intentionally ignored.

## Notes

`PROJECT_MEMORY.md` captures important operating details such as Lovable secret names and production project IDs. Keep it current when infrastructure changes.
