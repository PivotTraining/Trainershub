create table if not exists private.trainer_signup_admin_notifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sent_at timestamptz,
  resend_email_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table private.trainer_signup_admin_notifications from public, anon, authenticated;
grant select, insert, update on private.trainer_signup_admin_notifications to service_role;

comment on table private.trainer_signup_admin_notifications is 'Idempotency ledger for one-time internal trainer onboarding/signup notifications.';
