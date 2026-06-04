-- Restore the App Review demo trainer (testing@trainershub.com) to a fully
-- populated trainer profile, AND create a populated client account so we can
-- capture client-side screenshots (Discover, trainer profile, Bookings).
--
-- Idempotent: re-running cleans + re-seeds.
-- Run in Supabase Studio SQL Editor.

do $$
declare
  v_trainer       uuid;
  v_demo_client   uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid;
  v_c1_id uuid; v_c2_id uuid; v_c3_id uuid;
  v_prog_strength uuid; v_prog_mobility uuid;
begin
  -- ── 1. Restore the trainer account ─────────────────────────────────────────
  select id into v_trainer from auth.users where email = 'testing@trainershub.com';
  if v_trainer is null then
    raise exception 'testing@trainershub.com not found in auth.users';
  end if;

  update profiles
     set role = 'trainer',
         full_name = 'Maya Chen'
   where id = v_trainer;

  insert into trainer_profiles
    (user_id, bio, specialties, hourly_rate_cents,
     location, session_types, vibe_tags, instant_book, is_verified,
     avg_rating, review_count)
  values
    (v_trainer,
     'NASM-certified coach. 8 years building strength + mobility programs for busy professionals. I meet you where you are.',
     array['strength','mobility','hiit','nutrition'],
     9500,
     'Suwanee, GA',
     array['in-person','virtual']::text[],
     array['motivator','data-driven']::text[],
     true,
     true,
     4.9,
     27)
  on conflict (user_id) do update
    set bio = excluded.bio,
        specialties = excluded.specialties,
        hourly_rate_cents = excluded.hourly_rate_cents,
        location = excluded.location,
        session_types = excluded.session_types,
        vibe_tags = excluded.vibe_tags,
        instant_book = excluded.instant_book,
        is_verified = excluded.is_verified,
        avg_rating = excluded.avg_rating,
        review_count = excluded.review_count;

  -- ── 2. Wipe prior demo data for this trainer ───────────────────────────────
  delete from bookings        where trainer_id = v_trainer;
  delete from sessions        where trainer_id = v_trainer;
  delete from program_assignments
   where program_id in (select id from programs where trainer_id = v_trainer);
  delete from programs        where trainer_id = v_trainer;
  delete from clients         where trainer_id = v_trainer;
  delete from packages        where trainer_id = v_trainer;
  delete from auth.users
   where email in (
     'demo-client-alex@trainerhub.local',
     'demo-client-jordan@trainerhub.local',
     'demo-client-sam@trainerhub.local'
   );

  -- ── 3. Three stub client auth users (for the trainer's roster) ────────────
  v_c1 := gen_random_uuid();
  v_c2 := gen_random_uuid();
  v_c3 := gen_random_uuid();

  insert into auth.users
    (id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  values
    (v_c1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo-client-alex@trainerhub.local', crypt('DemoClient!2026', gen_salt('bf')),
     now(), jsonb_build_object('full_name','Alex Rivera','role','client'), now(), now()),
    (v_c2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo-client-jordan@trainerhub.local', crypt('DemoClient!2026', gen_salt('bf')),
     now(), jsonb_build_object('full_name','Jordan Patel','role','client'), now(), now()),
    (v_c3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo-client-sam@trainerhub.local', crypt('DemoClient!2026', gen_salt('bf')),
     now(), jsonb_build_object('full_name','Sam Chen','role','client'), now(), now());

  insert into clients (user_id, trainer_id, goals, notes) values
    (v_c1, v_trainer, 'Build strength, run a 5k',     'Prefers morning sessions.')
    returning id into v_c1_id;
  insert into clients (user_id, trainer_id, goals, notes) values
    (v_c2, v_trainer, 'Mobility and posture',         'Desk worker, tight hips.')
    returning id into v_c2_id;
  insert into clients (user_id, trainer_id, goals, notes) values
    (v_c3, v_trainer, 'Lose 10 lbs, gain energy',     'New to lifting.')
    returning id into v_c3_id;

  -- ── 4. Five upcoming sessions on clean clock times ─────────────────────────
  insert into sessions (trainer_id, client_id, starts_at, duration_min, status, notes) values
    (v_trainer, v_c1_id, date_trunc('day', now()) + interval '1 day 9 hours',                60, 'scheduled', 'Lower body — squat focus'),
    (v_trainer, v_c2_id, date_trunc('day', now()) + interval '2 days 17 hours 30 minutes',  45, 'scheduled', 'Hip mobility'),
    (v_trainer, v_c3_id, date_trunc('day', now()) + interval '3 days 7 hours',               60, 'scheduled', 'Intro to barbell'),
    (v_trainer, v_c1_id, date_trunc('day', now()) + interval '7 days 9 hours',               60, 'scheduled', 'Upper body — push'),
    (v_trainer, v_c2_id, date_trunc('day', now()) + interval '9 days 17 hours 30 minutes',  45, 'scheduled', 'Thoracic mobility');

  -- ── 5. Two programs, each assigned to one client ──────────────────────────
  insert into programs (trainer_id, title, description) values
    (v_trainer, 'Beginner Strength', '8-week intro plan: 3x/week full-body.')
    returning id into v_prog_strength;
  insert into programs (trainer_id, title, description) values
    (v_trainer, 'Mobility Reset',    '4-week daily mobility flow for desk workers.')
    returning id into v_prog_mobility;

  insert into program_assignments (program_id, client_id) values
    (v_prog_strength, v_c3_id),
    (v_prog_mobility, v_c2_id);

  -- ── 6. Three selectable packages ──────────────────────────────────────────
  insert into packages (trainer_id, title, session_count, price_cents, description, is_active) values
    (v_trainer, 'Starter Pack',       5,  25000, '5 one-hour sessions. Great for getting started.', true),
    (v_trainer, '10-Session Bundle', 10,  45000, 'Save $50. Best value for a 10-week block.',       true),
    (v_trainer, 'Monthly Unlimited', 12,  60000, 'Up to 12 sessions in a calendar month.',          true);

  -- ── 7. Populated client account for client-side screenshots ───────────────
  select id into v_demo_client from auth.users where email = 'client-demo@trainerhub.local';
  if v_demo_client is null then
    v_demo_client := gen_random_uuid();
    insert into auth.users
      (id, instance_id, aud, role, email, encrypted_password,
       email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    values
      (v_demo_client, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'client-demo@trainerhub.local', crypt('ClientDemo!2026', gen_salt('bf')),
       now(),
       jsonb_build_object('full_name','Alex Rivera','role','client'),
       now(), now());
  else
    update auth.users
       set encrypted_password = crypt('ClientDemo!2026', gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now())
     where id = v_demo_client;
  end if;

  insert into profiles (id, email, full_name, role)
  values (v_demo_client, 'client-demo@trainerhub.local', 'Alex Rivera', 'client')
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = excluded.role;

  -- give the client a couple of upcoming bookings WITH the demo trainer
  delete from bookings where client_id = v_demo_client;
  insert into bookings (trainer_id, client_id, starts_at, duration_min, session_type, status, notes) values
    (v_trainer, v_demo_client, date_trunc('day', now()) + interval '1 day 18 hours',  60, 'virtual',   'confirmed', 'Form check — squat'),
    (v_trainer, v_demo_client, date_trunc('day', now()) + interval '4 days 8 hours',  60, 'in-person', 'confirmed', 'Push day');

  raise notice 'Restored trainer % and seeded client %', v_trainer, v_demo_client;
end $$;
