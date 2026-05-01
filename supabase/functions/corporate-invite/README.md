# corporate-invite Edge Function

Sends invite emails to employees added to a corporate account.

## Required environment variables

Set these in your Supabase project dashboard under
**Project Settings → Edge Functions → Secrets**:

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `EMAIL_FROM` | Sender address, e.g. `TrainerHub <invites@trainerhub.app>` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
injected automatically by the Supabase runtime.

## Deploy

```bash
supabase functions deploy corporate-invite --project-ref rwemcpmykuctcsgmzupo
```

## Local testing

```bash
supabase functions serve corporate-invite --env-file .env.local
```

Call with:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/corporate-invite' \
  --header 'Authorization: Bearer <user-jwt>' \
  --header 'Content-Type: application/json' \
  --data '{"inviteIds":["<uuid>"]}'
```
