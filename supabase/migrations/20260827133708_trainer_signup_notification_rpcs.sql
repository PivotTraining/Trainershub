create or replace function public.claim_trainer_signup_admin_notification(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = private, public
as $$
begin
  insert into private.trainer_signup_admin_notifications(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  return found;
end;
$$;

create or replace function public.complete_trainer_signup_admin_notification(
  p_user_id uuid,
  p_resend_email_id text
)
returns void
language sql
security definer
set search_path = private, public
as $$
  update private.trainer_signup_admin_notifications
  set sent_at = now(),
      resend_email_id = p_resend_email_id,
      last_error = null,
      updated_at = now()
  where user_id = p_user_id;
$$;

create or replace function public.release_trainer_signup_admin_notification(p_user_id uuid)
returns void
language sql
security definer
set search_path = private, public
as $$
  delete from private.trainer_signup_admin_notifications
  where user_id = p_user_id and sent_at is null;
$$;

revoke all on function public.claim_trainer_signup_admin_notification(uuid) from public, anon, authenticated;
revoke all on function public.complete_trainer_signup_admin_notification(uuid,text) from public, anon, authenticated;
revoke all on function public.release_trainer_signup_admin_notification(uuid) from public, anon, authenticated;
grant execute on function public.claim_trainer_signup_admin_notification(uuid) to service_role;
grant execute on function public.complete_trainer_signup_admin_notification(uuid,text) to service_role;
grant execute on function public.release_trainer_signup_admin_notification(uuid) to service_role;
