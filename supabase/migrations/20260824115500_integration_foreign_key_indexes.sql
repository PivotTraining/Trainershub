create index if not exists integration_oauth_states_user_id_idx
  on private.integration_oauth_states(user_id);

create index if not exists integration_oauth_states_corporate_account_id_idx
  on private.integration_oauth_states(corporate_account_id)
  where corporate_account_id is not null;

create index if not exists integration_calendar_event_links_booking_id_idx
  on public.integration_calendar_event_links(booking_id);

create index if not exists integration_sync_events_connection_id_idx
  on public.integration_sync_events(integration_connection_id);
