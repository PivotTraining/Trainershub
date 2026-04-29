-- Extend trainer_profiles with marketplace fields
ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS session_types TEXT[] NOT NULL DEFAULT ARRAY['in-person']::TEXT[],
  ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT ARRAY['English']::TEXT[],
  ADD COLUMN IF NOT EXISTS vibe_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS instant_book BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancellation_hours INT NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS video_intro_url TEXT,
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Availability slots (trainer recurring weekly schedule)
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer manages own slots" ON availability_slots
  USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "anyone can view slots" ON availability_slots FOR SELECT USING (true);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client creates own review" ON reviews FOR INSERT
  WITH CHECK (client_id = auth.uid());
CREATE POLICY "anyone can view reviews" ON reviews FOR SELECT USING (true);

-- Function to update avg_rating on reviews
CREATE OR REPLACE FUNCTION update_trainer_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE trainer_profiles
  SET
    avg_rating = (SELECT AVG(rating)::NUMERIC(3,2) FROM reviews WHERE trainer_id = NEW.trainer_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE trainer_id = NEW.trainer_id)
  WHERE user_id = NEW.trainer_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_update_trainer_rating ON reviews;
CREATE TRIGGER trg_update_trainer_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_trainer_rating();

-- Session packages
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  session_count INT NOT NULL CHECK (session_count > 0),
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer manages own packages" ON packages
  USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "anyone can view active packages" ON packages FOR SELECT USING (is_active = TRUE);

-- Package purchases
CREATE TABLE IF NOT EXISTS package_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sessions_remaining INT NOT NULL CHECK (sessions_remaining >= 0),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE package_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client sees own purchases" ON package_purchases FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "trainer sees their sales" ON package_purchases FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "client inserts own purchase" ON package_purchases FOR INSERT WITH CHECK (client_id = auth.uid());

-- Client-initiated bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_min INT NOT NULL DEFAULT 60,
  session_type TEXT NOT NULL DEFAULT 'in-person' CHECK (session_type IN ('in-person','virtual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined','canceled')),
  package_purchase_id UUID REFERENCES package_purchases(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client sees own bookings" ON bookings FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "trainer sees their bookings" ON bookings FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "client creates booking" ON bookings FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "trainer updates booking status" ON bookings FOR UPDATE USING (trainer_id = auth.uid());
CREATE POLICY "client can cancel" ON bookings FOR UPDATE USING (client_id = auth.uid());

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, trainer_id)
);
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client manages own favorites" ON favorites
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

-- Progress journal
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  mood INT CHECK (mood BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client manages own journal" ON journal_entries
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

-- ── Package balance decrement ─────────────────────────────────────────────────
-- When a booking moves to 'confirmed' and has a package_purchase_id,
-- decrement sessions_remaining by 1 (floor at 0).
CREATE OR REPLACE FUNCTION decrement_package_sessions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'confirmed'
     AND OLD.status <> 'confirmed'
     AND NEW.package_purchase_id IS NOT NULL THEN
    UPDATE package_purchases
    SET sessions_remaining = GREATEST(sessions_remaining - 1, 0)
    WHERE id = NEW.package_purchase_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_package_sessions ON bookings;
CREATE TRIGGER trg_decrement_package_sessions
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION decrement_package_sessions();

-- Store Expo push tokens for push notifications
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
