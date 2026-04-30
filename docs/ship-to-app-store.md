# Shipping TrainerHub to App Store Connect (Mac mini)

Step-by-step from "code on this Mac" to "build uploaded to App Store Connect".

## 1 · Get the code onto the Mac mini

On **this Mac** (MacBook Air), run in Terminal — once — to push to GitHub:

```bash
cd /Users/chrisdavis/TrainerHub
git push -u origin main
```

GitHub will prompt for username + a personal access token (classic, with
`repo` scope) — generate one at <https://github.com/settings/tokens> if you
don't have it handy.

On the **Mac mini**, clone:

```bash
cd ~
git clone https://github.com/PivotTraining/Trainershub.git
cd Trainershub
npm install --legacy-peer-deps
```

Then create `.env` in the project root with these three lines:

```
EXPO_PUBLIC_SUPABASE_URL=https://rwemcpmykuctcsgmzupo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_OlRC1cuDgjeUgo_VIkfcDg_ZLKeOQUq
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51MYXwyERWdPcDJ1Zp45qUdV744DUe25WGukDNx8VOdzpx1DnSX9FGRUMh0DkRUwQ6YF5fVcyqcvrpbEhCia7CTOz00p0C2Ofa3
```

## 2 · Create the App Store Connect record

1. Open <https://appstoreconnect.apple.com/apps>
2. **My Apps → "+" → New App**
3. Fill in:
   - Platforms: **iOS**
   - Name: **TrainerHub**
   - Primary language: English (US)
   - Bundle ID: pick **`com.trainerhub.app`** (must match `app.json` exactly)
   - SKU: anything unique, e.g. `TRAINERHUB001`
4. Save — note the **Apple ID** (a 10-digit number) shown on the app page;
   we'll wire that into `eas.json` later if you ever switch to EAS Submit.

## 3 · Make sure the Bundle ID is registered

1. Open <https://developer.apple.com/account/resources/identifiers/list>
2. **+ → App IDs → Continue → App**
3. Description: TrainerHub
4. Bundle ID: explicit, `com.trainerhub.app`
5. Capabilities: enable **Push Notifications** and **Sign in with Apple**
   (leave the rest off for now — you can add them later)
6. Continue → Register

## 4 · Native iOS prebuild + pod install (Mac mini)

In the cloned project on the Mac mini:

```bash
npx expo prebuild --platform ios --clean
cd ios
pod install
cd ..
```

`prebuild` regenerates the `ios/` folder from `app.json`, picking up the
`expo-location`, `expo-calendar`, and Stripe plugins. `pod install` wires up
the React Native + Stripe + RevenueCat etc. native dependencies.

## 5 · Archive in Xcode

```bash
open ios/TrainerHub.xcworkspace
```

Inside Xcode:

1. Top-left scheme picker → **TrainerHub**
2. Destination → **Any iOS Device (arm64)** (NOT a simulator)
3. **TrainerHub** project → **Signing & Capabilities** tab
   - Team: pick your Apple Developer team
   - Toggle "Automatically manage signing" on
4. Menu: **Product → Archive**

Xcode builds for ~3-5 minutes. When done, the **Organizer** window opens.

## 6 · Upload to App Store Connect

In the Organizer:

1. Pick the latest archive
2. Click **Distribute App**
3. Choose **App Store Connect** → **Upload**
4. Defaults are fine for the next screens — just click through
5. Select the Distribution certificate (let Xcode auto-create if asked)
6. **Upload**

It uploads (~3 minutes), then Apple does background processing (~10-30
minutes). When ready, the build appears in App Store Connect under
**TestFlight → iOS Builds**.

## 7 · TestFlight or App Store

- **TestFlight**: invite testers immediately after the build finishes
  processing. They install via the TestFlight app on their phone.
- **App Store**: fill in the listing (screenshots, description, age rating,
  privacy URL, support URL), then submit for review. Apple takes 24-48
  hours to review on average.

## Common gotchas

- **"No account for team"** in Xcode → Sign into your Apple ID under
  Xcode → Settings → Accounts.
- **"Provisioning profile doesn't include the device"** → Switch destination
  to "Any iOS Device" instead of a specific connected phone.
- **"App Transport Security"** errors → already handled in `app.json`
  (`usesNonExemptEncryption: false`).
- **Push notifications** require an APNs key — generate at
  <https://developer.apple.com/account/resources/authkeys/list>, download
  `.p8`, upload to Supabase Auth or wherever you're sending pushes.

## After upload — App Store listing checklist

- [ ] App icon: 1024x1024 PNG (already at `assets/images/icon.png`)
- [ ] Screenshots: at least 3 for 6.7" and 6.5" iPhones
- [ ] App description, keywords, support URL, privacy policy URL
- [ ] Age rating questionnaire
- [ ] Stripe Connect: confirm webhook endpoint registered in Stripe Dashboard
- [ ] Submit for review

## Resend SMTP

Before going public, follow `docs/setup-resend-smtp.md` to lift the
sign-in email rate limit from 4/hour to 100/day.
