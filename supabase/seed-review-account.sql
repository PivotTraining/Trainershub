-- Seed demo data for the App Store reviewer account.
--
-- HOW TO USE
-- 1. First create the auth user in Supabase Studio:
--    Authentication → Users → Add user
--      Email:    <your-reviewer-email>     (replace below too)
--      Password: TrainerHubReview2026!
--      Auto Confirm User: ON
-- 2. Edit REVIEWER_EMAIL below to match.
-- 3. Run this whole file in the SQL Editor.
-- 4. Verify with: select * from profiles where email = '<your-reviewer-email>';
--    Role should be 'trainer'; you should see 3 clients, 5 sessions, 2 programs.
--
-- Idempotent: re-running cleans previously seeded demo data for this reviewer
-- and re-creates it.

do $$
declare
  REVIEWER_EMAIL constant text := 'REPLACE_ME@gmail.com';  -- <<< CHANGE THIS

  v_trainer_id uuid;
  v_c1_user uuid;
  v_c2_user uuid;
  v_c3_user uuid;
  v_c1_id   uuid;
  v_c2_id   uuid;
  v_c3_id   uuid;
  v_prog_strength uuid;
  v_prog_mobility uuid;
begin
  -- 1. Find the reviewer auth user
  select id into v_trainer_id from auth.users where email = REVIEWER_EMAIL;
  if v_trainer_id is null then
    raise exception 'Reviewer user % not found. Create it in Auth → Users first.', REVIEWER_EMAIL;
  end if;

  -- 2. Promote to trainer role and set profile name
  update profiles
     set role = 'trainer',
         full_name = 'Review Trainer'
   where id = v_trainer_id;

  insert into trainer_profiles (user_id, bio, specialties, hourly_rate_cents)
  values (v_trainer_id,
          'Demo trainer account for App Store review.',
          array['strength', 'mobility', 'hiit'],
          12000)
  on conflict (user_id) do update
    set bio = excluded.bio,
        specialties = excluded.specialties,
        hourly_rate_cents = excluded.hourly_rate_cents;

  -- 3. Clean any prior demo data for this reviewer
  delete from sessions where trainer_id = v_trainer_id;
  delete from program_assignments
    where program_id in (select id from programs where trainer_id = v_trainer_id);
  delete from programs where trainer_id = v_trainer_id;
  delete from clients  where trainer_id = v_trainer_id;
  delete from auth.users
    where email in (
      'demo-client-alex@trainerhub.local',
      'demo-client-jordan@trainerhub.local',
      'demo-client-sam@trainerhub.local'
    );

  -- 4. Create 3 stub client auth users (the on_auth_user_created trigger
  --    will insert matching profiles rows automatically).
  v_c1_user := gen_random_uuid();
  v_c2_user := gen_random_uuid();
  v_c3_user := gen_random_uuid();

  insert into auth.users
    (id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  values
    (v_c1_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo-client-alex@trainerhub.local',
     crypt('DemoClient!2026', gen_salt('bf')),
     now(), jsonb_build_object('full_name','Alex Rivera','role','client'), now(), now()),
    (v_c2_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo-client-jordan@trainerhub.local',
     crypt('DemoClient!2026', gen_salt('bf')),
     now(), jsonb_build_object('full_name','Jordan Patel','role','client'), now(), now()),
    (v_c3_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'demo-client-sam@trainerhub.local',
     crypt('DemoClient!2026', gen_salt('bf')),
     now(), jsonb_build_object('full_name','Sam Chen','role','client'), now(), now());

  -- 5. Link them as the reviewer's clients
  insert into clients (user_id, trainer_id, goals, notes) values
    (v_c1_user, v_trainer_id, 'Build strength, run a 5k', 'Prefers morning sessions.')
    returning id into v_c1_id;
  insert into clients (user_id, trainer_id, goals, notes) values
    (v_c2_user, v_trainer_id, 'Mobility and posture',     'Desk worker, tight hips.')
    returning id into v_c2_id;
  insert into clients (user_id, trainer_id, goals, notes) values
    (v_c3_user, v_trainer_id, 'Lose 10 lbs, gain energy', 'New to lifting.')
    returning id into v_c3_id;

  -- 6. 5 upcoming sessions across the next two weeks
  insert into sessions (trainer_id, client_id, starts_at, duration_min, status, notes) values
    (v_trainer_id, v_c1_id, now() + interval '1 day'  + time '09:00', 60, 'scheduled', 'Lower body — squat focus'),
    (v_trainer_id, v_c2_id, now() + interval '2 days' + time '17:30', 45, 'scheduled', 'Hip mobility'),
    (v_trainer_id, v_c3_id, now() + interval '3 days' + time '07:00', 60, 'scheduled', 'Intro to barbell'),
    (v_trainer_id, v_c1_id, now() + interval '7 days' + time '09:00', 60, 'scheduled', 'Upper body — push'),
    (v_trainer_id, v_c2_id, now() + interval '9 days' + time '17:30', 45, 'scheduled', 'Thoracic mobility');

  -- 7. 2 training programs, each assigned to a client
  insert into programs (trainer_id, title, description) values
    (v_trainer_id, 'Beginner Strength', '8-week intro plan: 3x/week full-body.')
    returning id into v_prog_strength;
  insert into programs (trainer_id, title, description) values
    (v_trainer_id, 'Mobility Reset',    '4-week daily mobility flow for desk workers.')
    returning id into v_prog_mobility;

  insert into program_assignments (program_id, client_id) values
    (v_prog_strength, v_c3_id),
    (v_prog_mobility, v_c2_id);

  raise notice 'Seeded demo data for trainer %', v_trainer_id;
end $$;
