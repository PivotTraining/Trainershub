alter table private.integration_oauth_states drop constraint if exists integration_oauth_states_provider_check;
alter table private.integration_oauth_states add constraint integration_oauth_states_provider_check check (provider in ('google_calendar','microsoft_365','zoom'));
