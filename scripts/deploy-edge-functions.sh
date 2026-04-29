#!/usr/bin/env bash
# deploy-edge-functions.sh
#
# Deploys all Supabase Edge Functions and sets the required secrets.
#
# Prerequisites:
#   brew install supabase/tap/supabase
#   supabase login
#
# Fill in the three values below, then run:
#   chmod +x scripts/deploy-edge-functions.sh
#   ./scripts/deploy-edge-functions.sh

set -euo pipefail

# ── FILL THESE IN ─────────────────────────────────────────────────────────────
SUPABASE_PROJECT_REF="REPLACE_WITH_YOUR_PROJECT_REF"   # e.g. abcdefghijklmno
STRIPE_SECRET_KEY="sk_live_REPLACE"                    # Stripe Dashboard → API keys → Secret key
STRIPE_WEBHOOK_SECRET="whsec_REPLACE"                  # Stripe Dashboard → Webhooks → Signing secret
# ──────────────────────────────────────────────────────────────────────────────

PLATFORM_FEE_PERCENT="4"
APP_SCHEME="trainerhub"

echo "🚀  Linking to Supabase project ${SUPABASE_PROJECT_REF}..."
supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo ""
echo "📦  Running DB migrations..."
supabase db push

echo ""
echo "🔐  Setting Edge Function secrets..."
supabase secrets set \
  STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  PLATFORM_FEE_PERCENT="$PLATFORM_FEE_PERCENT" \
  APP_SCHEME="$APP_SCHEME" \
  --project-ref "$SUPABASE_PROJECT_REF"

echo ""
echo "🚢  Deploying Edge Functions..."
supabase functions deploy delete-account        --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy invite-client         --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy create-connect-account --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy create-payment-intent  --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy stripe-webhook         --project-ref "$SUPABASE_PROJECT_REF"

echo ""
echo "✅  Done!"
echo ""
echo "Next steps:"
echo "  1. In Stripe Dashboard → Webhooks, add endpoint:"
echo "     https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/stripe-webhook"
echo "     Events: payment_intent.succeeded, payment_intent.payment_failed, account.updated"
echo ""
echo "  2. Add to your .env:"
echo "     EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_..."
echo ""
echo "  3. Build with EAS:"
echo "     eas build --platform ios --profile preview"
