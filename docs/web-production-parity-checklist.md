# Web production parity checklist

- [x] Replace fake browser Stripe success shim with real Stripe Payment Element confirmation.
- [x] Preserve native Stripe PaymentSheet for iOS/Android.
- [x] Keep phone bottom navigation.
- [x] Add desktop sidebar navigation.
- [x] Add browser `.ics` calendar export.
- [x] Add web app manifest and mobile web metadata.
- [ ] Validate latest Vercel preview build.
- [ ] Verify sign-in, reset-password, marketplace, booking, and payment routes on preview.
- [ ] Confirm production Supabase migration/Edge Functions are deployed.
- [ ] Confirm Stripe live/test secrets and webhook.
- [ ] Attach `trainershub.app` to the production project.
- [ ] Merge to `main` and validate production.
