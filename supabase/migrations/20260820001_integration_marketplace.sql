create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  corporate_account_id uuid references public.corporate_accounts(id) on delete cascade,
  provider text not null,
  category text not null,
  status text not null default 'available' check (status in ('available','pending','connected','needs_setup','disabled','error')),
  scope text not null default 'personal' check (scope in ('personal','enterprise')),
  display_name text,
  external_account_label text,
  config_public jsonb not null default '{}'::jsonb,
  credentials_ref text,
  last_sync_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((owner_user_id is not null and corporate_account_id is null) or (owner_user_id is null and corporate_account_id is not null))
);

create unique index if not exists integration_connections_personal_provider_uq on public.integration_connections(owner_user_id, provider) where owner_user_id is not null;
create unique index if not exists integration_connections_enterprise_provider_uq on public.integration_connections(corporate_account_id, provider) where corporate_account_id is not null;
create index if not exists integration_connections_corp_idx on public.integration_connections(corporate_account_id);
create index if not exists integration_connections_owner_idx on public.integration_connections(owner_user_id);

alter table public.integration_connections enable row level security;

create policy "users_manage_own_integrations" on public.integration_connections
for all to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()) and corporate_account_id is null and scope = 'personal');

create policy "corp_admins_manage_integrations" on public.integration_connections
for all to authenticated
using (corporate_account_id is not null and public.is_corp_admin(corporate_account_id))
with check (corporate_account_id is not null and owner_user_id is null and scope = 'enterprise' and public.is_corp_admin(corporate_account_id));

create table if not exists public.integration_sync_events (
  id bigint generated always as identity primary key,
  integration_connection_id uuid not null references public.integration_connections(id) on delete cascade,
  event_type text not null,
  status text not null check (status in ('started','success','failed','skipped')),
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.integration_sync_events enable row level security;
create policy "integration_owners_read_sync_events" on public.integration_sync_events
for select to authenticated
using (exists (
  select 1 from public.integration_connections ic
  where ic.id=integration_connection_id
    and (ic.owner_user_id=(select auth.uid()) or (ic.corporate_account_id is not null and public.is_corp_admin(ic.corporate_account_id)))
));

comment on column public.integration_connections.credentials_ref is 'Opaque reference to credentials stored outside ordinary app tables. Never store OAuth, SAML, SCIM, or HRIS secrets in config_public.';
