-- App Review demo trainer account + sample data.
--
-- Apple Review Guideline 2.1(a): reviewer must be able to sign in to a trainer
-- account with full feature access. This migration creates a deterministic
-- trainer (review-trainer@trainerhub.app) plus three client users and seeds the
-- dashboard with clients, bookings, programs, packages, and availability so the
-- app exhibits its full functionality.
--
-- Idempotent: re-running the migration is a no-op (ON CONFLICT DO NOTHING).
-- Credentials must match docs/app-store-connect-copy.md → "App Review Notes".

-- Deterministic UUIDs so re-seeding is stable.
--   trainer:  11111111-1111-1111-1111-111111111111
--   client A: 22222222-2222-2222-2222-222222222222
--   client B: 33333333-3333-3333-3333-333333333333
--   client C: 44444444-4444-4444-4444-444444444444

DO $$
DECLARE
  trainer_uid uuid := '11111111-1111-1111-1111-111111111111';
  client_a    uuid := '22222222-2222-2222-2222-222222222222';
  client_b    uuid := '33333333-3333-3333-3333-333333333333';
  client_c    uuid := '44444444-4444-4444-4444-444444444444';
  trainer_pw  text := 'TrainerHubReview2026!';
  client_pw   text := 'ClientReview2026!';
  client_a_clientid uuid;
  client_b_clientid uuid;
  client_c_clientid uuid;
  prog_strength_id  uuid;
BEGIN
  -- ── auth.users ────────────────────────────────────────────────────────────
  -- Trainer (password sign-in target for the App Review reviewer).
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES (
    trainer_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'review-trainer@trainerhub.app', crypt(trainer_pw, gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name','Riley Morgan','role','trainer'),
    now(), now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Client users (no need to sign in as them, but rows must exist to satisfy
  -- the clients.user_id → profiles → auth.users FK chain).
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES
    (client_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo-client-a@trainerhub.app', crypt(client_pw, gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     jsonb_build_object('full_name','Avery Chen','role','client'), now(), now()),
    (client_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo-client-b@trainerhub.app', crypt(client_pw, gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     jsonb_build_object('full_name','Jordan Patel','role','client'), now(), now()),
    (client_c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo-client-c@trainerhub.app', crypt(client_pw, gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     jsonb_build_object('full_name','Sam Rivera','role','client'), now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ── profiles ──────────────────────────────────────────────────────────────
  -- The handle_new_user() trigger inserts these on auth.users INSERT, but we
  -- upsert here so the migration is correct even if the trigger is disabled
  -- or the rows already exist with stale data.
  INSERT INTO profiles (id, email, full_name, role)
  VALUES
    (trainer_uid, 'review-trainer@trainerhub.app', 'Riley Morgan', 'trainer'),
    (client_a,    'demo-client-a@trainerhub.app', 'Avery Chen',   'client'),
    (client_b,    'demo-client-b@trainerhub.app', 'Jordan Patel', 'client'),
    (client_c,    'demo-client-c@trainerhub.app', 'Sam Rivera',   'client')
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role      = EXCLUDED.role,
        email     = EXCLUDED.email;

  UPDATE profiles
     SET phone         = '+1 415-555-0142',
         location_city = 'San Francisco, CA',
         streak_count  = 12
   WHERE id = trainer_uid;

  -- ── trainer_profiles ──────────────────────────────────────────────────────
  INSERT INTO trainer_profiles (user_id, bio, specialties, hourly_rate_cents)
  VALUES (
    trainer_uid,
    'Certified personal trainer with 8 years of experience. I help busy professionals build strength, lose fat, and stay consistent.',
    ARRAY['Strength training','Fat loss','Mobility','Habit coaching'],
    9500
  )
  ON CONFLICT (user_id) DO UPDATE
    SET bio              = EXCLUDED.bio,
        specialties      = EXCLUDED.specialties,
        hourly_rate_cents = EXCLUDED.hourly_rate_cents;

  -- ── clients ───────────────────────────────────────────────────────────────
  INSERT INTO clients (user_id, trainer_id, goals, notes)
  VALUES
    (client_a, trainer_uid, 'Lose 15 lbs and run a 10K by summer.',          'Knee sensitivity — substitute lunges.'),
    (client_b, trainer_uid, 'Build upper-body strength, bench 1.2x bodyweight.', 'Prefers morning sessions before work.'),
    (client_c, trainer_uid, 'General fitness and stress relief.',            'New to lifting — start with foundations.')
  ON CONFLICT (user_id, trainer_id) DO NOTHING;

  SELECT id INTO client_a_clientid FROM clients WHERE user_id = client_a AND trainer_id = trainer_uid;
  SELECT id INTO client_b_clientid FROM clients WHERE user_id = client_b AND trainer_id = trainer_uid;
  SELECT id INTO client_c_clientid FROM clients WHERE user_id = client_c AND trainer_id = trainer_uid;

  -- ── sessions (legacy table — kept for trainer history view) ───────────────
  -- Use stable session IDs derived from client UUIDs so re-runs don't duplicate.
  INSERT INTO sessions (id, trainer_id, client_id, starts_at, duration_min, status, notes)
  VALUES
    ('aaaaaaa1-0000-0000-0000-000000000001', trainer_uid, client_a_clientid, now() - interval '7 days',  60, 'completed', 'Lower body — squats, RDLs. Felt strong.'),
    ('aaaaaaa1-0000-0000-0000-000000000002', trainer_uid, client_b_clientid, now() - interval '5 days',  60, 'completed', 'Push day. Bench 3x5 @ 155.'),
    ('aaaaaaa1-0000-0000-0000-000000000003', trainer_uid, client_c_clientid, now() - interval '3 days',  45, 'completed', 'Foundations — hip hinge, plank, breathing.'),
    ('aaaaaaa1-0000-0000-0000-000000000004', trainer_uid, client_a_clientid, now() - interval '2 days',  60, 'canceled',  'Client sick — rescheduled.')
  ON CONFLICT (id) DO NOTHING;

  -- ── bookings (current marketplace table — Bookings tab reads this) ────────
  INSERT INTO bookings (id, trainer_id, client_id, starts_at, duration_min, session_type, status, notes)
  VALUES
    ('bbbbbbb1-0000-0000-0000-000000000001', trainer_uid, client_a, now() + interval '1 day  + 9 hours', 60, 'in-person', 'confirmed', 'Glute focus, light squat day.'),
    ('bbbbbbb1-0000-0000-0000-000000000002', trainer_uid, client_b, now() + interval '2 days + 7 hours', 60, 'in-person', 'confirmed', 'Bench progression — work up to 165.'),
    ('bbbbbbb1-0000-0000-0000-000000000003', trainer_uid, client_c, now() + interval '3 days + 17 hours', 45, 'virtual',   'pending',   'Intro mobility flow.'),
    ('bbbbbbb1-0000-0000-0000-000000000004', trainer_uid, client_a, now() + interval '7 days + 9 hours', 60, 'in-person', 'pending',   'Programming check-in.'),
    ('bbbbbbb1-0000-0000-0000-000000000005', trainer_uid, client_b, now() - interval '1 day  + 7 hours', 60, 'in-person', 'confirmed', 'Past session — kept for history.')
  ON CONFLICT (id) DO NOTHING;

  -- ── programs + assignment ────────────────────────────────────────────────
  INSERT INTO programs (id, trainer_id, title, description)
  VALUES
    ('ccccccc1-0000-0000-0000-000000000001', trainer_uid, 'Strength Foundations (8 wks)', '3-day full body split. Squat, bench, deadlift, accessories.'),
    ('ccccccc1-0000-0000-0000-000000000002', trainer_uid, 'Fat Loss Conditioning (6 wks)', 'Mixed-modal conditioning + 2 lifting days. High-volume metabolic work.')
  ON CONFLICT (id) DO NOTHING;

  prog_strength_id := 'ccccccc1-0000-0000-0000-000000000001';

  INSERT INTO program_assignments (program_id, client_id)
  VALUES
    (prog_strength_id, client_b_clientid),
    ('ccccccc1-0000-0000-0000-000000000002', client_a_clientid)
  ON CONFLICT (program_id, client_id) DO NOTHING;

  -- ── availability_slots (Mon/Wed/Fri mornings + Sat midday) ────────────────
  INSERT INTO availability_slots (trainer_id, day_of_week, start_time, end_time)
  SELECT trainer_uid, dow, '07:00'::time, '11:00'::time FROM unnest(ARRAY[1,3,5]) dow
  ON CONFLICT DO NOTHING;
  INSERT INTO availability_slots (trainer_id, day_of_week, start_time, end_time)
  VALUES (trainer_uid, 6, '10:00', '14:00')
  ON CONFLICT DO NOTHING;

  -- ── packages ─────────────────────────────────────────────────────────────
  INSERT INTO packages (id, trainer_id, title, session_count, price_cents, description, is_active)
  VALUES
    ('ddddddd1-0000-0000-0000-000000000001', trainer_uid, 'Starter — 4 sessions',   4, 38000,
     'Try a month of training. Four 60-min sessions, programming included.', true),
    ('ddddddd1-0000-0000-0000-000000000002', trainer_uid, 'Committed — 12 sessions', 12, 99000,
     'Twelve sessions over 6-8 weeks. Best value for serious progress.', true)
  ON CONFLICT (id) DO NOTHING;
END $$;
