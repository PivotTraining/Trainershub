# TrainerHub production-readiness audit

Updated: 2026-08-11

## Executive status

TrainerHub has a solid Expo/React Native foundation and the current iOS bundle
identifier is correctly set to `com.trainerhub.app`. The repository is configured
at iOS/Android build 27, but the EAS account currently shows its most recent
cloud iOS build as build 20; later TestFlight builds therefore need to be
reconciled with App Store Connect before the next upload.

Lint, TypeScript, and all 58 Jest tests pass. Expo Doctor initially found three
SDK patch mismatches; those dependencies are now aligned and all 18 Doctor
checks pass.

## P0 — financial, authorization, and data-integrity risks

- **Booking updates were too broad.** Authenticated users with an applicable RLS
  row could update protected booking/payment columns. The hardening migration
  limits app users to the `status` column, enforces actor-specific transitions,
  applies cancellation windows, and leaves payment state to the Stripe webhook.
- **Confirmed bookings could overlap.** Transaction advisory locks and overlap
  checks now prevent a trainer or client from having two confirmed bookings at
  the same time.
- **Package credits could be minted without payment.** Direct client inserts are
  now revoked. The package purchase UI is explicitly unavailable until a secure
  server-side Stripe checkout is implemented.
- **Package credits did not decrement reliably.** The old trigger ran with the
  caller's restricted permissions. The replacement performs an atomic,
  relationship-checked decrement and returns the credit on cancellation.
- **Marketplace reviews were broken.** The app passed a booking ID to a foreign
  key referencing legacy sessions, and the rating trigger could not update the
  trainer row under client permissions. Reviews now have a proper `booking_id`,
  require a completed confirmed booking owned by the reviewer, and update rating
  aggregates through a locked-down trigger.
- **Push notification delivery was unsafe and non-functional.** The mobile app
  attempted to read another user's private Expo token and send arbitrary payloads
  directly. A new authenticated Edge Function validates booking ownership,
  retrieves the token server-side, and emits a fixed booking notification.
- **Stripe intent retries could duplicate charges.** Booking-scoped idempotency,
  connected-account readiness checks, prepaid-package rejection, strict webhook
  database error handling, and full-refund reconciliation were added.
- **Corporate account creation was non-atomic and blocked by its own RLS.** A
  transactional RPC now creates the account and first owner together. Recursive
  admin-policy checks and unsafe helper search paths were also fixed.
- **Marketplace identity joins conflicted with profile privacy.** Narrow RPCs now
  return only public trainer fields and display-safe booking names instead of
  requiring exposure of profile email, phone, or push-token columns.
- **App Review login exposed a bundled shared secret.** The production sign-in
  screen contained a secret capable of minting a session for the reviewer
  account whenever the matching function flag was enabled. The bypass and Edge
  Function are removed; reviewer access now uses a normal password account whose
  credentials live only in App Store Connect.
- **Account deletion failures were reported as queued success.** No deletion
  queue existed. The app now retains the signed-in session and reports an honest
  failure; successful server deletion clears the local session immediately.
- **Password recovery was missing.** Users can now request a reset email, return
  through the native deep link, establish a recovery session, and set a new
  password.

## P1 — next implementation slices

1. Build package checkout with a server-created Stripe PaymentIntent, webhook-only
   package credit issuance, refunds, receipts, and idempotent fulfillment.
2. Add booking reschedule workflows, time-zone display/selection, and explicit
   cancellation/refund policy UX. New booking requests now enforce published
   recurring availability, reject past/last-minute times, preserve date and time
   components across native pickers, and recover from schedule-loading errors.
3. Add Stripe customer records, saved payment methods, payment receipts, payout
   status, disputes, and refund controls.
4. Add notification delivery receipts, invalid-token cleanup, booking-status push
   events, and scheduled server reminders.
5. Add avatar/media storage with RLS, image validation, upload progress, and
   deletion lifecycle.
6. Complete accessibility coverage: labels/hints/states for all controls, Dynamic
   Type layouts, focus order, screen-reader testing, reduced motion, and contrast.
7. Add error boundaries per major flow, offline-aware retry behavior, analytics,
   crash reporting, and privacy-safe observability.
8. Expand automated coverage to auth/onboarding, booking collisions, payments,
   review eligibility, corporate seats/invites, and account deletion. Add Maestro
   end-to-end smoke tests that do not depend on production auth internals.

## P2 — release and operational hardening

- Populate the EAS-managed `development`, `preview`, and `production`
  environments. Build profiles are now isolated and no longer commit live
  Supabase/Stripe values, but distinct service projects must still be supplied.
- Rotate and audit service credentials; verify Edge Function JWT settings and
  CORS policy; run Supabase database/security advisors after migration.
- Reconcile App Store Connect build history with EAS remote versioning before
  incrementing build 27 or creating a new upload.
- Validate privacy nutrition labels, account deletion, support/privacy URLs,
  notification/location/calendar permission timing, screenshots, review account,
  export compliance, and Stripe marketplace disclosures.
- Establish staging smoke tests, database backups, migration rollback/runbooks,
  webhook monitoring, and production incident ownership.

## Deployment gates for this slice

This branch intentionally does not mutate production services. Before release:

1. Confirm the actual TrainerHub Supabase project, then authenticate the CLI. The
   repository currently references `lluhpxjngcyxlmezuxks`, but it is not visible
   through the connected Supabase account and must not be assumed to be correct.
2. Review current production schema drift and existing overlapping bookings.
3. Apply the new migration to staging, run RLS/advisor tests, then promote it.
4. Deploy `notify-booking-created`, `create-payment-intent`, and `stripe-webhook`.
5. Add `charge.refunded` to the Stripe webhook subscription and test signed
   webhook retries in Stripe test mode.
6. Exercise client/trainer booking, cancellation, review, package-credit, payout,
   and corporate-account flows with staging identities.
7. Run a fresh iOS device build and TestFlight smoke test. Do not upload build 27
   until App Store Connect confirms the next accepted build number.
8. Add `trainerhub://reset-password` to the Supabase Auth redirect allowlist,
   test password recovery on a physical iPhone, and remove any previously
   deployed `review-signin` function.
9. Populate all three EAS environments, then verify preview uses a non-production
   Supabase project and a Stripe test publishable key before creating a build.

## Known external blockers

- Supabase access token/project authorization and production database credentials.
- Stripe test/live Dashboard access and webhook signing secret.
- App Store Connect access/Apple 2FA for build-history and rejection details.
- Product decisions for package payments, cancellation/refund policy, corporate
  billing, moderation/admin scope, analytics vendor, and privacy disclosures.
- The remaining npm advisories are in Expo SDK 54's Metro/image parser toolchain.
  npm proposes incompatible Expo/React Native downgrades, so they should be
  tracked upstream rather than force-fixed in this release branch.
