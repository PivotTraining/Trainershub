# TrainerHub — App Store Connect Listing Copy

> Ready to paste into App Store Connect.
> Bundle ID: com.trainerhub.app · Version 1.0.0

---

## App Name (30 chars max)

```
TrainerHub
```

---

## Subtitle (30 chars max)

```
Train Smarter. Grow Faster.
```

---

## Description (4000 chars max)

```
TrainerHub is the all-in-one platform for personal trainers and their clients.

FOR TRAINERS
Run your entire coaching business from your phone. Accept new client requests, schedule sessions, track completed workouts, and get paid — all in one place.

• Client Management — Keep profiles, goals, and session notes for every client in one organized view.
• Smart Scheduling — Create your availability windows, let clients book sessions, and get instant notifications when a new request comes in.
• Session Tracking — Mark sessions complete, add notes, and build a full history of every client's progress.
• Training Programs — Build reusable workout programs and assign them directly to clients.
• Revenue Dashboard — See your monthly earnings, session counts, and booking trends at a glance.
• Stripe Payouts — Connect your Stripe account once and get paid automatically for every completed session.

FOR CLIENTS
Book your trainer, view your upcoming sessions, and follow your custom programs — all from your phone.

• Instant Booking — Request sessions directly from your trainer's live availability calendar.
• Your Schedule — See every upcoming session with date, time, and duration in one clear view.
• Custom Programs — Access the workout programs your trainer built specifically for you.
• Session History — Review completed sessions and notes from past workouts.

SIMPLE. SECURE. PROFESSIONAL.
TrainerHub uses industry-standard security (Supabase + Stripe) to keep client data private and payments safe. Sign in with a one-tap email code — no password to remember.

Whether you're a solo trainer scaling your client base or a dedicated athlete following a personalized program, TrainerHub keeps everyone on the same page.

Download free and get started today.
```

---

## Keywords (100 chars max, comma-separated)

```
personal trainer,fitness,workout,coaching,trainer app,clients,schedule,sessions,strength,gym
```

---

## Support URL

```
https://trainerhub.app/support
```

> ⚠️ **Apple previously rejected the listing because this URL returned an error.**
> A self-contained static support page now lives at `public/support.html`. Deploy
> it so that `https://trainerhub.app/support` serves that file (or returns a 200
> when the URL is fetched) before resubmitting.

---

## Privacy Policy URL

```
https://trainerhub.app/privacy
```

---

## Marketing URL (optional)

```
https://trainerhub.app
```

---

## Age Rating

**17+** — reason: Unrestricted Web Access (app makes API calls to Supabase/Stripe)

Steps in App Store Connect:
1. Go to your app → **App Information** → **Age Rating**
2. Click **Edit**
3. Set "Unrestricted Web Access" → **Frequent/Intense**
4. This auto-sets the rating to **17+**
5. Save

---

## App Review Notes

```
TRAINER DEMO ACCOUNT (Guideline 2.1(a))

Easiest path — one tap, no typing:
  On the Sign In screen, tap "Continue as Demo Trainer" near the bottom.
  This signs you straight into the seeded trainer account below.

Manual credentials (if you prefer to type them):
  Email:    review-trainer@trainerhub.app
  Password: TrainerHubReview2026!
  Method:   Use the default "Password" sign-in (not the one-time code).

The trainer account is pre-populated with:
• 3 sample clients (Avery, Jordan, Sam) with goals and notes
• 5 bookings — mix of confirmed, pending, and one past session
• 4 historical sessions with completion notes
• 2 training programs with client assignments
• 4 weekly availability windows (M/W/F mornings + Saturday)
• 2 active packages (4-session and 12-session bundles)
• Stripe Connect runs in test mode (no real payments are processed)

CLIENT EXPERIENCE
To see the client side of the app, sign out and create a fresh account with
"I'm a client" selected, or sign in as one of the seeded clients:
  demo-client-a@trainerhub.app / ClientReview2026!

NOTES
• The app supports both password and one-time email-code sign-in. The demo
  credentials use password sign-in so no email access is required.
• Account deletion is available from Profile → Settings → Delete Account.
```

---

## Screenshots Checklist

| Size | Dimensions | Device | Status |
|------|-----------|--------|--------|
| 6.9" (required) | 1320×2868 px | iPhone 17 Pro Max | ⏳ |
| 6.5" (recommended) | 1242×2688 px | Resized from 6.9" | ⏳ |

### Recommended screen order:
1. **Home / Dashboard** — revenue stats, upcoming sessions (trainer-first money view)
2. **Clients** — client list showing avatars, names, last session
3. **Schedule** — session calendar / list grouped by day
4. **Session Detail** — individual session with client name, time, notes
5. **Profile / Packages** — trainer profile with package offerings

---

## What's New (Version Notes)

```
Initial release of TrainerHub.

• Trainer dashboard with revenue tracking and session overview
• Client management with profiles and session history
• Smart availability scheduling and instant booking
• Custom training programs and client assignment
• Stripe Connect payouts
• Secure email OTP authentication
```

---

## Category

**Primary:** Health & Fitness  
**Secondary:** Business  

---

## Copyright

```
2025 TrainerHub
```

---

## Pricing

**Free** (with in-app Stripe Connect for trainer payouts)
