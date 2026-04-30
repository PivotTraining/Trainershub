# Removing the email rate limit (set up Resend SMTP)

## Why this matters

Supabase's built-in email service is great for testing but rate-limited
(roughly **2–4 sign-in emails per hour** on the free tier). Once you go past
that during testing — or once a real user gets the limit — sign-in fails.

The fix is to plug in your own SMTP provider. Resend is the simplest:
**3,000 emails / month free, 100 / day**, sender domain auto-verified.

## Steps (10 minutes)

1. Sign up at <https://resend.com/signup> with your work email.
2. Go to **Domains → Add Domain** and add `trainerhub.app` (or any domain you
   own). Add the DNS records Resend gives you (MX, SPF, DKIM).  Resend
   verifies in a couple minutes once the records are live.
3. Go to **API Keys → Create API Key** with "Sending access" only and copy
   the key.
4. In Supabase Dashboard go to
   <https://supabase.com/dashboard/project/rwemcpmykuctcsgmzupo/auth/providers>
   → scroll to **SMTP Settings** → toggle **Enable Custom SMTP**.

   Fill in:

   | Field | Value |
   | --- | --- |
   | Sender email | `noreply@trainerhub.app` (or any address @ your domain) |
   | Sender name  | TrainerHub |
   | Host         | `smtp.resend.com` |
   | Port         | `465` |
   | Username     | `resend` |
   | Password     | *the API key from step 3* |
   | Minimum interval | `1` (seconds) |

5. Click **Save**.

That's it. Resend now handles all auth emails: OTP codes, magic links, email
verification, password resets. Rate limit goes from 4/hour → 100/day, and
deliverability dramatically improves because emails come from your own
domain instead of `noreply@mail.app.supabase.io`.

## Cost when you scale

If you cross 3,000 emails / month Resend pricing kicks in (about $20/mo for
50k emails). At the point you're sending that many transactional emails
you'll already be making revenue — and you can also re-evaluate Postmark,
SendGrid, or Mailgun for higher-volume tiers.

## Verifying it works

After saving SMTP config, go back to the simulator, sign out, sign in with
a fresh email. The email should arrive in under 30s, with `From:` showing
your domain instead of `mail.app.supabase.io`.
