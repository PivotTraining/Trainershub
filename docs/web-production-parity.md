# TrainerHub web production parity

This branch makes TrainerHub a first-class browser product on phone, tablet, and desktop while preserving the native iOS/Android app.

## Included in this tranche

- Real Stripe Payment Element checkout on web. The old web shim could report success without charging.
- Responsive navigation: five-item bottom navigation on phone; expanded left sidebar on desktop web.
- Browser calendar export using `.ics` files while native builds continue to use `expo-calendar`.
- Web app manifest, installable icon, and mobile-web metadata for Add to Home Screen / standalone display.

## Production validation required

- Confirm `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is the intended production key in Vercel.
- Confirm the production `create-payment-intent` Edge Function and Stripe webhook are deployed with live secrets.
- Run a real Stripe test-mode transaction end to end before enabling live charges.
- Verify client and trainer login, booking, cancellation, and review flows on desktop Chrome/Safari and mobile Safari/Chrome.
- Verify `trainershub.app` custom domain is attached to the production Vercel project.

## Follow-on parity

- Browser push notifications require a web-push service worker/VAPID path; Expo push tokens remain native-only.
- Additional wide-screen content density improvements can be added screen by screen after the responsive shell lands.
