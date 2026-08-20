create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.integration_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  corporate_account_id uuid references public.corporate_accounts(id) on delete cascade,
  provider text not null check (provider in ('google_calendar','microsoft_365')),
  scope text not null check (scope in ('personal','enterprise')),
  return_url text not null,
  expires_at timestamptz not null default now() + interval '10 minutes',
  created_at timestamptz not null default now()
);

grant select, insert, delete on private.integration_oauth_states to service_role;

create table if not exists public.integration_calendar_event_links (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null references public.integration_connections(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  external_calendar_id text,
  external_event_id text not null,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (integration_connection_id, booking_id)
);

alter table public.integration_calendar_event_links enable row level security;
create policy "integration_owners_read_calendar_links" on public.integration_calendar_event_links
for select to authenticated
using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
  and exists (
    select 1 from public.integration_connections ic
    where ic.id = integration_connection_id
      and (
        ic.owner_user_id = (select auth.uid())
        or (ic.corporate_account_id is not null and public.is_corp_admin(ic.corporate_account_id))
      )
  )
);

create or replace function public.integration_secret_upsert(p_name text, p_secret text, p_description text default null)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_id uuid;
  secret_id uuid;
begin
  select id into existing_id from vault.secrets where name = p_name limit 1;
  if existing_id is null then
    secret_id := vault.create_secret(p_secret, p_name, p_description, null);
  else
    perform vault.update_secret(existing_id, p_secret, p_name, p_description, null);
    secret_id := existing_id;
  end if;
  return secret_id;
end;
$$;

create or replace function public.integration_secret_read(p_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;

create or replace function public.integration_secret_delete(p_name text)
returns void
language sql
security definer
set search_path = public, vault
as $$
  delete from vault.secrets where name = p_name;
$$;

revoke all on function public.integration_secret_upsert(text,text,text) from public, anon, authenticated;
revoke all on function public.integration_secret_read(text) from public, anon, authenticated;
revoke all on function public.integration_secret_delete(text) from public, anon, authenticated;
grant execute on function public.integration_secret_upsert(text,text,text) to service_role;
grant execute on function public.integration_secret_read(text) to service_role;
grant execute on function public.integration_secret_delete(text) to service_role;

create or replace function public.integration_oauth_state_create(
  p_state text,
  p_user_id uuid,
  p_provider text,
  p_scope text,
  p_corporate_account_id uuid,
  p_return_url text
)
returns void
language sql
security definer
set search_path = private, public
as $$
  insert into private.integration_oauth_states(state,user_id,corporate_account_id,provider,scope,return_url)
  values (p_state,p_user_id,p_corporate_account_id,p_provider,p_scope,p_return_url);
$$;

create or replace function public.integration_oauth_state_consume(p_state text)
returns table(user_id uuid, corporate_account_id uuid, provider text, scope text, return_url text)
language plpgsql
security definer
set search_path = private, public
as $$
begin
  return query
  delete from private.integration_oauth_states s
  where s.state = p_state and s.expires_at > now()
  returning s.user_id, s.corporate_account_id, s.provider, s.scope, s.return_url;
end;
$$;

revoke all on function public.integration_oauth_state_create(text,uuid,text,text,uuid,text) from public, anon, authenticated;
revoke all on function public.integration_oauth_state_consume(text) from public, anon, authenticated;
grant execute on function public.integration_oauth_state_create(text,uuid,text,text,uuid,text) to service_role;
grant execute on function public.integration_oauth_state_consume(text) to service_role;
