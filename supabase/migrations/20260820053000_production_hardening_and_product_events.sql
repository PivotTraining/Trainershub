create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_name text not null check (char_length(event_name) between 1 and 80),
  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object' and pg_column_size(properties) <= 16384),
  created_at timestamptz not null default now()
);

create index if not exists product_events_user_created_idx on public.product_events (user_id, created_at desc);
create index if not exists product_events_name_created_idx on public.product_events (event_name, created_at desc);

alter table public.product_events enable row level security;

drop policy if exists product_events_insert_own on public.product_events;
create policy product_events_insert_own
on public.product_events
for insert
to authenticated
with check (user_id = (select auth.uid()));

revoke all on table public.product_events from anon;
revoke select, update, delete on table public.product_events from authenticated;
grant insert on table public.product_events to authenticated;

alter function public.decrement_package_sessions() set search_path = '';
alter function public.touch_updated_at() set search_path = '';

alter policy "trainer manages own slots" on public.availability_slots to authenticated;
alter policy "client sees own bookings" on public.bookings to authenticated;
alter policy "trainer sees their bookings" on public.bookings to authenticated;
alter policy clients_self_read on public.clients to authenticated;
alter policy clients_trainer_all on public.clients to authenticated;
alter policy corp_accounts_admin_all on public.corporate_accounts to authenticated;
alter policy corp_accounts_member_read on public.corporate_accounts to authenticated;
alter policy corp_admins_read on public.corporate_admins to authenticated;
alter policy corp_invites_admin_all on public.corporate_invites to authenticated;
alter policy corp_members_admin_all on public.corporate_members to authenticated;
alter policy corp_members_self_read on public.corporate_members to authenticated;
alter policy "client manages own favorites" on public.favorites to authenticated;
alter policy "client manages own journal" on public.journal_entries to authenticated;
alter policy "client sees own purchases" on public.package_purchases to authenticated;
alter policy "trainer sees their sales" on public.package_purchases to authenticated;
alter policy "trainer manages own packages" on public.packages to authenticated;
alter policy profiles_trainer_can_view_clients on public.profiles to authenticated;
alter policy program_assignments_client_read on public.program_assignments to authenticated;
alter policy program_assignments_trainer_all on public.program_assignments to authenticated;
alter policy programs_client_read on public.programs to authenticated;
alter policy programs_trainer_all on public.programs to authenticated;
alter policy sessions_client_read on public.sessions to authenticated;
alter policy sessions_trainer_all on public.sessions to authenticated;
alter policy trainer_profiles_read on public.trainer_profiles to authenticated;
alter policy trainer_profiles_write on public.trainer_profiles to authenticated;
