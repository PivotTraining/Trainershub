-- Helper function used only in E2E / CI: retrieve the most recent OTP token
-- for a given email from the auth.mfa_factors / auth.flow_state tables.
-- Access is restricted to service-role callers via RLS on the calling context.
--
-- NOTE: Only deploy to staging/test projects — do NOT apply to production.

create or replace function get_otp_for_email(p_email text)
returns text
language sql
security definer
set search_path = auth, public
as $$
  select token
  from auth.flow_state
  where auth_code_used = false
    and created_at > now() - interval '10 minutes'
    -- flow_state stores the email in the user_id field for OTP flows
    and user_id = (
      select id from auth.users where email = p_email limit 1
    )
  order by created_at desc
  limit 1;
$$;

-- Restrict execution to service role only
revoke execute on function get_otp_for_email(text) from public, anon, authenticated;
grant execute on function get_otp_for_email(text) to service_role;
