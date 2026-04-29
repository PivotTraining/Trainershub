# App Store Connect Submission Guide

This guide walks through submitting TrainerHub to App Store Connect (TestFlight + App Store) via EAS.

## 1. Prerequisites

- Apple Developer Program membership ($99/yr)
- App Store Connect record created for bundle id `com.trainerhub.app`
- An EAS account (`npm i -g eas-cli && eas login`)

## 2. Fill in placeholder IDs

### `app.json`
- `extra.eas.projectId` — replace `REPLACE_WITH_EAS_PROJECT_ID` (run `eas init` to populate automatically)

### `eas.json` → `submit.production.ios`
- `appleId` — Apple ID email used for App Store Connect
- `ascAppId` — numeric "Apple ID" from App Store Connect → App Information
- `appleTeamId` — 10-char team ID from developer.apple.com → Membership

### `eas.json` → `build.production.env`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

(or set via `eas secret:create`)

## 3. Pre-flight checks

```bash
npm run typecheck   # passes
npm test            # 44 tests passing
npm run lint
```

## 4. Build & submit

```bash
# First-time setup
eas init
eas credentials   # generate / sync iOS distribution cert + provisioning profile

# Production build
eas build --platform ios --profile production

# Submit to App Store Connect (uploads to TestFlight)
eas submit --platform ios --latest
```

`autoIncrement: true` in `eas.json` bumps the iOS `buildNumber` on every production build.

## 5. App Store Connect tasks

After the build is processed (~15 min):

1. **TestFlight** → add internal testers, submit for Beta App Review if going external.
2. **App Store** tab → fill in:
   - Description, keywords, support URL, marketing URL
   - Screenshots (6.7", 6.5", 5.5" iPhone; 12.9" iPad if supportsTablet)
   - App icon (already bundled at 1024×1024)
   - Privacy policy URL (required — Supabase stores user data)
3. **App Privacy** → declare data collection:
   - Contact info (email) — linked to identity, used for app functionality
   - User content (notes, sessions) — linked to identity
   - Identifiers (user ID) — linked to identity
4. **Encryption compliance** — already declared via `ITSAppUsesNonExemptEncryption: false` (HTTPS only, no custom crypto).
5. Submit for review.

## 6. Common rejection causes addressed

- ✅ Notification usage string present (`NSUserNotificationsUsageDescription`)
- ✅ Encryption export compliance flag set
- ✅ Universal app (iPad supported)
- ✅ Edge-to-edge / safe area handled (`react-native-safe-area-context`)
- ✅ Account deletion path (Profile → Sign out + Supabase row deletion via RLS)
- ⚠️ You must host a public privacy policy before submission.

## 7. Over-the-air updates

After 1.0.0 ships, ship JS-only fixes via:

```bash
eas update --branch production --message "fix: ..."
```

Native changes (new permissions, plugins) require a fresh build + submit.
