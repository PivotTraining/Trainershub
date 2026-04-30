-- Expand user profiles with the data trainers need to see and the
-- streak / liability fields the dashboard depends on.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth        DATE,
  ADD COLUMN IF NOT EXISTS phone                TEXT,
  ADD COLUMN IF NOT EXISTS location_city        TEXT,
  ADD COLUMN IF NOT EXISTS location_lat         NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS location_lng         NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS streak_unit          TEXT NOT NULL DEFAULT 'days'
    CHECK (streak_unit IN ('days','weeks','months')),
  ADD COLUMN IF NOT EXISTS streak_count         INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_last_logged   DATE,
  ADD COLUMN IF NOT EXISTS liability_accepted_at TIMESTAMPTZ;

-- A trainer can read the basic identity columns of any client they have a
-- session with — gated by the existing sessions/clients RLS join.  The
-- profiles_self_read policy already covers the user's own profile.
DROP POLICY IF EXISTS profiles_trainer_can_view_clients ON profiles;
CREATE POLICY profiles_trainer_can_view_clients ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.user_id = profiles.id
        AND c.trainer_id = auth.uid()
    )
  );
