create or replace function public.is_corp_admin(acct_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    and exists (
      select 1 from public.corporate_admins ca
      where ca.corporate_account_id = acct_id
        and ca.user_id = (select auth.uid())
    );
$$;

create or replace function public.is_corp_member(acct_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    and exists (
      select 1 from public.corporate_members cm
      where cm.corporate_account_id = acct_id
        and cm.user_id = (select auth.uid())
        and cm.status = 'active'
    );
$$;

create or replace function public.is_corp_owner(acct_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    and exists (
      select 1 from public.corporate_admins ca
      where ca.corporate_account_id = acct_id
        and ca.user_id = (select auth.uid())
        and ca.role = 'owner'
    );
$$;

create or replace function public.my_corp_account_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cm.corporate_account_id
  from public.corporate_members cm
  where (select auth.uid()) is not null
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    and cm.user_id = (select auth.uid())
    and cm.status = 'active'
  limit 1;
$$;

create or replace function public.can_view_seat_usage(acct_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    and (public.is_corp_admin(acct_id) or public.is_corp_member(acct_id));
$$;

create or replace function public.get_trainer_directory(p_trainer_id uuid default null)
returns table(
  user_id uuid,
  full_name text,
  avatar_url text,
  bio text,
  specialties text[],
  hourly_rate_cents integer,
  location text,
  session_types text[],
  languages text[],
  vibe_tags text[],
  instant_book boolean,
  cancellation_hours integer,
  video_intro_url text,
  avg_rating numeric,
  review_count integer,
  is_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    tp.user_id,
    p.full_name,
    p.avatar_url,
    tp.bio,
    tp.specialties,
    tp.hourly_rate_cents,
    tp.location,
    tp.session_types,
    tp.languages,
    tp.vibe_tags,
    tp.instant_book,
    tp.cancellation_hours,
    tp.video_intro_url,
    tp.avg_rating,
    tp.review_count,
    tp.is_verified
  from public.trainer_profiles tp
  join public.profiles p on p.id = tp.user_id
  where (select auth.uid()) is not null
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    and (p_trainer_id is null or tp.user_id = p_trainer_id)
  order by tp.avg_rating desc, p.full_name asc;
$$;

create or replace function public.create_corporate_account(
  p_name text,
  p_domain text default null,
  p_billing_email text default null,
  p_seat_count integer default 10
)
returns public.corporate_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  created_account public.corporate_accounts;
begin
  if caller_id is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = true then
    raise exception using errcode = '42501', message = 'Authenticated account required.';
  end if;
  if nullif(pg_catalog.btrim(p_name), '') is null then
    raise exception using errcode = '23514', message = 'Company name is required.';
  end if;
  if p_seat_count < 1 or p_seat_count > 10000 then
    raise exception using errcode = '23514', message = 'Seat count must be between 1 and 10000.';
  end if;

  insert into public.corporate_accounts (name, domain, billing_email, seat_count)
  values (
    pg_catalog.btrim(p_name),
    nullif(pg_catalog.lower(pg_catalog.btrim(p_domain)), ''),
    nullif(pg_catalog.btrim(p_billing_email), ''),
    p_seat_count
  )
  returning * into created_account;

  insert into public.corporate_admins (corporate_account_id, user_id, role)
  values (created_account.id, caller_id, 'owner');

  return created_account;
end;
$$;
