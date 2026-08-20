drop policy if exists "users_manage_own_integrations" on public.integration_connections;
drop policy if exists "corp_admins_manage_integrations" on public.integration_connections;
drop policy if exists "integration_owners_read_sync_events" on public.integration_sync_events;

create policy "users_manage_own_integrations" on public.integration_connections
for all to authenticated
using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
  and owner_user_id = (select auth.uid())
)
with check (
  coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
  and owner_user_id = (select auth.uid())
  and corporate_account_id is null
  and scope = 'personal'
);

create policy "corp_admins_manage_integrations" on public.integration_connections
for all to authenticated
using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
  and corporate_account_id is not null
  and public.is_corp_admin(corporate_account_id)
)
with check (
  coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
  and corporate_account_id is not null
  and owner_user_id is null
  and scope = 'enterprise'
  and public.is_corp_admin(corporate_account_id)
);

create policy "integration_owners_read_sync_events" on public.integration_sync_events
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
