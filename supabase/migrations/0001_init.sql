-- TrainerHub initial schema: profiles, clients, sessions, programs

create type user_role as enum ('trainer', 'client');
create type session_status as enum ('scheduled', 'completed', 'canceled');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'client',
  created_at timestamptz not null default now()
);

create table trainer_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  bio text,
  specialties text[] not null default '{}',
  hourly_rate_cents integer
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  trainer_id uuid not null references profiles(id) on delete cascade,
  goals text,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, trainer_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  starts_at timestamptz not null,
  duration_min integer not null check (duration_min > 0),
  status session_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now()
);
create index sessions_trainer_starts_idx on sessions (trainer_id, starts_at desc);
create index sessions_client_starts_idx on sessions (client_id, starts_at desc);

create table programs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table program_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  started_at timestamptz not null default now(),
  unique (program_id, client_id)
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

alter table profiles enable row level security;
alter table trainer_profiles enable row level security;
alter table clients enable row level security;
alter table sessions enable row level security;
alter table programs enable row level security;
alter table program_assignments enable row level security;

create policy profiles_self_read on profiles for select using (id = auth.uid());
create policy profiles_self_update on profiles for update using (id = auth.uid());

create policy trainer_profiles_read on trainer_profiles
  for select using (auth.role() = 'authenticated');
create policy trainer_profiles_write on trainer_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy clients_trainer_all on clients
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
create policy clients_self_read on clients
  for select using (user_id = auth.uid());

create policy sessions_trainer_all on sessions
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
create policy sessions_client_read on sessions
  for select using (
    exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())
  );

create policy programs_trainer_all on programs
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
create policy programs_client_read on programs
  for select using (
    exists (
      select 1 from program_assignments pa
      join clients c on c.id = pa.client_id
      where pa.program_id = programs.id and c.user_id = auth.uid()
    )
  );

create policy program_assignments_trainer_all on program_assignments
  for all using (
    exists (select 1 from programs p where p.id = program_id and p.trainer_id = auth.uid())
  ) with check (
    exists (select 1 from programs p where p.id = program_id and p.trainer_id = auth.uid())
  );
create policy program_assignments_client_read on program_assignments
  for select using (
    exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())
  );
