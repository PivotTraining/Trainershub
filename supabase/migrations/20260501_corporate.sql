-- ─────────────────────────────────────────────────────────────────────────────
-- Corporate / B2B accounts
-- ─────────────────────────────────────────────────────────────────────────────

-- Plan tiers
CREATE TYPE corporate_plan AS ENUM ('starter', 'growth', 'enterprise');

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE corporate_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  domain              TEXT,                          -- e.g. "nike.com" (optional)
  logo_url            TEXT,
  plan                corporate_plan NOT NULL DEFAULT 'starter',
  seat_count          INT  NOT NULL DEFAULT 10,
  billing_email       TEXT,
  stripe_customer_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE corporate_admin_role AS ENUM ('owner', 'admin');

CREATE TABLE corporate_admins (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id  UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                  corporate_admin_role NOT NULL DEFAULT 'admin',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (corporate_account_id, user_id)
);

CREATE TYPE corporate_member_status AS ENUM ('invited', 'active', 'suspended');

CREATE TABLE corporate_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id  UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                corporate_member_status NOT NULL DEFAULT 'active',
  invited_by            UUID REFERENCES auth.users(id),
  seat_assigned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (corporate_account_id, user_id)
);

CREATE TABLE corporate_invites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id  UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  invited_by            UUID NOT NULL REFERENCES auth.users(id),
  token                 UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (corporate_account_id, email)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_corporate_admins_user    ON corporate_admins(user_id);
CREATE INDEX idx_corporate_members_user   ON corporate_members(user_id);
CREATE INDEX idx_corporate_members_acct   ON corporate_members(corporate_account_id);
CREATE INDEX idx_corporate_invites_token  ON corporate_invites(token);
CREATE INDEX idx_corporate_invites_email  ON corporate_invites(email);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER corporate_accounts_updated_at
  BEFORE UPDATE ON corporate_accounts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE corporate_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_admins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_invites   ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin of the given account?
CREATE OR REPLACE FUNCTION is_corp_admin(acct_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM corporate_admins
    WHERE corporate_account_id = acct_id
      AND user_id = auth.uid()
  );
$$;

-- Helper: is the current user an active member of the given account?
CREATE OR REPLACE FUNCTION is_corp_member(acct_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM corporate_members
    WHERE corporate_account_id = acct_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Helper: get the corporate_account_id for the current user (member or admin)
CREATE OR REPLACE FUNCTION my_corp_account_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT corporate_account_id FROM corporate_members
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

-- corporate_accounts
--   admins can read/update their own account
--   members can read their own account
DROP POLICY IF EXISTS corp_accounts_admin_all   ON corporate_accounts;
DROP POLICY IF EXISTS corp_accounts_member_read ON corporate_accounts;

CREATE POLICY corp_accounts_admin_all ON corporate_accounts
  FOR ALL USING (is_corp_admin(id));

CREATE POLICY corp_accounts_member_read ON corporate_accounts
  FOR SELECT USING (is_corp_member(id));

-- corporate_admins
--   admins can read all admins in their account
--   owners can add/remove admins
DROP POLICY IF EXISTS corp_admins_read   ON corporate_admins;
DROP POLICY IF EXISTS corp_admins_manage ON corporate_admins;

CREATE POLICY corp_admins_read ON corporate_admins
  FOR SELECT USING (is_corp_admin(corporate_account_id));

CREATE POLICY corp_admins_manage ON corporate_admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM corporate_admins ca
      WHERE ca.corporate_account_id = corporate_account_id
        AND ca.user_id = auth.uid()
        AND ca.role = 'owner'
    )
  );

-- corporate_members
--   admins can manage all members in their account
--   members can read their own row
DROP POLICY IF EXISTS corp_members_admin_all  ON corporate_members;
DROP POLICY IF EXISTS corp_members_self_read  ON corporate_members;

CREATE POLICY corp_members_admin_all ON corporate_members
  FOR ALL USING (is_corp_admin(corporate_account_id));

CREATE POLICY corp_members_self_read ON corporate_members
  FOR SELECT USING (user_id = auth.uid());

-- corporate_invites
--   admins can create/read/delete invites for their account
--   anyone can read an invite by token (for the accept flow — no auth yet)
DROP POLICY IF EXISTS corp_invites_admin_all  ON corporate_invites;
DROP POLICY IF EXISTS corp_invites_token_read ON corporate_invites;

CREATE POLICY corp_invites_admin_all ON corporate_invites
  FOR ALL USING (is_corp_admin(corporate_account_id));

-- Token lookup is done in a Supabase Edge Function with service role key,
-- so no anon SELECT policy is needed here. Keeping it locked down.

-- ── Seats used view (convenience) ────────────────────────────────────────────

CREATE OR REPLACE VIEW corporate_seat_usage AS
SELECT
  ca.id                                            AS corporate_account_id,
  ca.seat_count,
  COUNT(cm.id) FILTER (WHERE cm.status = 'active') AS seats_used
FROM corporate_accounts ca
LEFT JOIN corporate_members cm ON cm.corporate_account_id = ca.id
GROUP BY ca.id, ca.seat_count;

-- Admins can read seat usage for their own account
CREATE OR REPLACE FUNCTION can_view_seat_usage(acct_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT is_corp_admin(acct_id) OR is_corp_member(acct_id);
$$;
