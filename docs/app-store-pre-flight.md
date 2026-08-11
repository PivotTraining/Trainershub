# App Store Pre-flight — TrainerHub

Final audit against the most common rejection reasons.  ✅ = handled,
⚠️ = needs your action before submitting, ❌ = blocker.

## Privacy / permissions ✅ all set in app.json

| Key | Value |
| --- | --- |
| `NSUserNotificationsUsageDescription` | session reminders |
| `NSLocationWhenInUseUsageDescription` | nearby trainers |
| `NSCalendarsUsageDescription` | add sessions to calendar |
| `NSPhotoLibraryAddUsageDescription` | save trainer share card |
| `ITSAppUsesNonExemptEncryption` | `false` (HTTPS only) |

Removed unused permission strings (camera, contacts, Face ID) — Apple
rejects apps that declare permissions they don't use.

## App icon ✅
- `assets/images/icon.png` is **1024×1024 RGB, no alpha** — passes.

## Account deletion ✅
- Delete Account button at the bottom of Profile tab calls
  `delete-account` Supabase Edge Function. Required by Guideline 5.1.1(v)
  since iOS 16.4.

## Liability / disclaimers ✅
- Onboarding requires checkbox: "TrainerHub is not responsible for trainers
  I meet…"
- Sign-in screen footer carries the same disclaimer.

## Stripe / payments ✅
- Coaching is a real-world service, **not** a digital good — Apple's
  Guideline 3.1.1 (in-app purchase) does NOT apply. We're allowed to use
  Stripe Connect for booking payouts. Same logic as Uber, ClassPass, Airbnb.
- App does not unlock features by external payment (only books real-world
  sessions), so Reader Rule (3.1.3(a)) doesn't apply either.

## Sign in with Apple ⚠️ skip-able for now
- Required only if we offer 3rd-party social logins (Google, Facebook,
  Twitter). We currently use first-party email/password or email-code login → not required.
- If you add Google sign-in later, you MUST add Sign in with Apple too.

## Push notifications ✅
- `expo-notifications` plugin handles APNs entitlement automatically.
- After you create the App Store Connect record, generate an **APNs Auth
  Key** at https://developer.apple.com/account/resources/authkeys/list
  (`.p8` file) and upload it to the Supabase project that handles pushes.

## ATS (App Transport Security) ✅
- All network calls go to HTTPS (Supabase, Stripe, Open-Meteo). No
  exceptions needed.

## Background modes ✅
- We don't use background fetch / location / audio. Nothing to declare.

## Privacy manifest (`PrivacyInfo.xcprivacy`) ⚠️ auto-generated
- Required since May 2024 for apps using certain APIs (UserDefaults, file
  timestamps, etc.). Expo SDK 54 auto-generates this during prebuild for
  the Expo modules. Verify it exists at
  `ios/TrainerHub/PrivacyInfo.xcprivacy` after `npx expo prebuild`.

## Required URLs (App Store Connect listing) ⚠️ you'll add these
- **Privacy Policy URL** — required. Put a basic one at
  https://trainerhub.app/privacy. Cover: data collected (email, name, DOB,
  phone, location, payment), where it goes (Supabase, Stripe), how to
  delete (in-app Delete Account button + email).
- **Support URL** — required. Anything live works:
  https://trainerhub.app/support or even a simple email form.
- **Marketing URL** — optional.

## Demo account for App Review ⚠️ you'll create this
Apple reviewers need to log in. In App Store Connect → App Review
Information, paste:

```
Username: review@trainerhub.app
Password: enter the dedicated review account password
Notes:
  Select Trainer, then use the username and password supplied above.
  No OTP inbox access or hidden login bypass is required.

  Contact for questions: chris@trainerhub.app
```

Create a dedicated least-privilege review account in Supabase and verify it on
a clean device before submitting. Store its credentials only in App Store Connect.

## Age rating ✅
- App targets 13+ (enforced at signup). Set to **17+** in App Store
  Connect to be safe (because the app collects DOB, phone, and location of
  potentially-minor users — Apple gets edgy here).

## Children's privacy ✅
- We gate at age 13. App is NOT marketed to children. Don't enable "Made
  for Kids" on the App Store listing.

## Functionality ✅
- Quiz fully works (multi-sector + drill-down).
- Calendar export, journal, streaks, weather all functional.
- Booking creates a real Supabase row, payment is real Stripe Connect.
- Password and one-time-code sign-in work end-to-end.
- Forgot Password opens the native reset route and updates the password.
- All tabs render without crashes (verified in simulator).

## Common things reviewers click that should NOT crash

- Sign out → sign back in
- Tap each bottom-tab while signed out → guard renders sign-in
- Tap Delete Account → confirms, calls edge fn, signs out
- Submit empty form → see validation error
- Tap location button with permission denied → see graceful message
- Tap calendar button with permission denied → see graceful message

## Final checklist (you'll tick these in App Store Connect)

- [ ] Privacy Policy URL filled in
- [ ] Support URL filled in
- [ ] App Review Sign-In Information contains working demo credentials
- [ ] Age rating: 17+ selected
- [ ] App icon 1024x1024 uploaded (already in project)
- [ ] Screenshots: 6.7" (iPhone 17 Pro Max), 6.5" (iPhone 11 Pro Max sim)
- [ ] Description, keywords, subtitle filled in
- [ ] Build selected from TestFlight processing list
- [ ] Submit for Review

## What I'd expect Apple to push back on (low risk, easy fixes)

1. **"App description doesn't match functionality"** — make sure the App
   Store description mentions ALL trainer types (basketball, tennis, golf,
   etc.), not just fitness.
2. **"Could not log in"** — verify the dedicated password account on a clean device.
3. **"Privacy manifest missing for X SDK"** — Expo auto-generates this,
   but if reviewer flags it, run `npx expo install --check` and re-archive.

That's it. Once `pod install` completes on the Mac mini, you're cleared
for Archive.
