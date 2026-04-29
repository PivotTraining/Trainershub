-- ── Stripe Connect columns ────────────────────────────────────────────────────

ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarded    BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Payment tracking on bookings ──────────────────────────────────────────────

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status    TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded'));

-- ── Index for webhook lookup ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_trainer_profiles_stripe_account
  ON trainer_profiles(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent
  ON bookings(payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;
