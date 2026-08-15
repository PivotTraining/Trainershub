-- Production integrity hardening for marketplace bookings, packages, and reviews.
--
-- This migration intentionally closes client-side write paths that could mint
-- unpaid package credits or mutate protected booking/payment fields. Payment
-- state remains writable by the Stripe webhook's service-role client.

-- Support the app's legacy-profile recovery path without allowing one user to
-- create a profile for another identity.
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
  on public.profiles
  for insert
  to authenticated
  with check (
    id = (select auth.uid())
    and email = coalesce((select auth.jwt() ->> 'email'), '')
  );

-- Reviews in the app are written for marketplace bookings, not legacy
-- trainer-created sessions. Keep session_id for existing data and introduce the
-- correct relationship for all new marketplace reviews.
alter table public.reviews
  add column if not exists booking_id uuid references public.bookings(id) on delete set null;

create unique index if not exists reviews_booking_id_unique
  on public.reviews (booking_id)
  where booking_id is not null;

drop policy if exists "client creates own review" on public.reviews;
create policy reviews_client_insert_completed_booking
  on public.reviews
  for insert
  to authenticated
  with check (
    client_id = (select auth.uid())
    and booking_id is not null
    and session_id is null
    and exists (
      select 1
      from public.bookings b
      where b.id = reviews.booking_id
        and b.client_id = (select auth.uid())
        and b.trainer_id = reviews.trainer_id
        and b.status = 'confirmed'
        and b.starts_at + (b.duration_min * interval '1 minute') <= now()
    )
  );

-- Rating aggregation must be able to update the trainer's row after a client
-- inserts a review. Restrict direct invocation and use a fixed search path.
create or replace function public.update_trainer_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_trainer_id uuid := coalesce(new.trainer_id, old.trainer_id);
begin
  update public.trainer_profiles
  set
    avg_rating = coalesce((
      select avg(r.rating)::numeric(3,2)
      from public.reviews r
      where r.trainer_id = target_trainer_id
    ), 0),
    review_count = (
      select count(*)
      from public.reviews r
      where r.trainer_id = target_trainer_id
    )
  where user_id = target_trainer_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.update_trainer_rating() from public, anon, authenticated;

drop trigger if exists trg_update_trainer_rating on public.reviews;
create trigger trg_update_trainer_rating
  after insert or update or delete on public.reviews
  for each row execute function public.update_trainer_rating();

-- Package credits are a financial asset. They may only be created by trusted
-- server-side payment/admin flows, never directly by a mobile client.
drop policy if exists "client inserts own purchase" on public.package_purchases;
revoke insert, update, delete on public.package_purchases from anon, authenticated;

-- Validate new booking requests against the trainer and any selected package.
drop policy if exists "client creates booking" on public.bookings;
create policy bookings_client_insert_valid_request
  on public.bookings
  for insert
  to authenticated
  with check (
    client_id = (select auth.uid())
    and status = 'pending'
    and payment_intent_id is null
    and payment_status = 'unpaid'
    and starts_at > now()
    and duration_min in (30, 45, 60, 90)
    and exists (
      select 1
      from public.trainer_profiles tp
      where tp.user_id = bookings.trainer_id
        and bookings.session_type = any(tp.session_types)
    )
    and (
      package_purchase_id is null
      or exists (
        select 1
        from public.package_purchases pp
        where pp.id = bookings.package_purchase_id
          and pp.client_id = (select auth.uid())
          and pp.trainer_id = bookings.trainer_id
          and pp.sessions_remaining > 0
      )
    )
  );

-- Mobile clients only need to change the status column. Payment intent/status
-- and booking ownership/schedule remain server-controlled.
revoke update on public.bookings from authenticated;
grant update (status) on public.bookings to authenticated;

drop policy if exists "trainer updates booking status" on public.bookings;
drop policy if exists "client can cancel" on public.bookings;

create policy bookings_trainer_updates_status
  on public.bookings
  for update
  to authenticated
  using (trainer_id = (select auth.uid()))
  with check (
    trainer_id = (select auth.uid())
    and status in ('confirmed', 'declined', 'canceled')
  );

create policy bookings_client_cancels
  on public.bookings
  for update
  to authenticated
  using (client_id = (select auth.uid()))
  with check (
    client_id = (select auth.uid())
    and status = 'canceled'
  );

-- Enforce legal state transitions, cancellation windows, and collision-free
-- confirmed bookings under a transaction-scoped advisory lock. The trigger is
-- SECURITY DEFINER so overlap checks see every relevant booking despite RLS.
create or replace function public.enforce_booking_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  cancellation_hours integer;
begin
  if tg_op = 'UPDATE' then
    if new.trainer_id is distinct from old.trainer_id
      or new.client_id is distinct from old.client_id
      or new.starts_at is distinct from old.starts_at
      or new.duration_min is distinct from old.duration_min
      or new.session_type is distinct from old.session_type
      or new.package_purchase_id is distinct from old.package_purchase_id
      or new.payment_intent_id is distinct from old.payment_intent_id
      or new.payment_status is distinct from old.payment_status then
      if caller_id is not null then
        raise exception using
          errcode = '42501',
          message = 'Only booking status can be changed from the app.';
      end if;
    end if;

    if new.status is distinct from old.status and caller_id is not null then
      if caller_id = old.client_id and caller_id <> old.trainer_id then
        if new.status <> 'canceled' or old.status not in ('pending', 'confirmed') then
          raise exception using errcode = '23514', message = 'This booking cannot be canceled.';
        end if;

        if old.status = 'confirmed' then
          select coalesce(tp.cancellation_hours, 24)
          into cancellation_hours
          from public.trainer_profiles tp
          where tp.user_id = old.trainer_id;

          if now() > old.starts_at - (coalesce(cancellation_hours, 24) * interval '1 hour') then
            raise exception using
              errcode = '23514',
              message = 'This booking is inside the trainer cancellation window.';
          end if;
        end if;
      elsif caller_id = old.trainer_id then
        if not (
          (old.status = 'pending' and new.status in ('confirmed', 'declined', 'canceled'))
          or (old.status = 'confirmed' and new.status = 'canceled')
        ) then
          raise exception using errcode = '23514', message = 'Invalid booking status transition.';
        end if;
      else
        raise exception using errcode = '42501', message = 'Not authorized to update this booking.';
      end if;
    end if;
  end if;

  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('trainer:' || new.trainer_id::text, 0)
    );
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('client:' || new.client_id::text, 0)
    );

    if exists (
      select 1
      from public.bookings b
      where b.id <> new.id
        and b.status = 'confirmed'
        and (b.trainer_id = new.trainer_id or b.client_id = new.client_id)
        and b.starts_at < new.starts_at + (new.duration_min * interval '1 minute')
        and new.starts_at < b.starts_at + (b.duration_min * interval '1 minute')
    ) then
      raise exception using
        errcode = '23P01',
        message = 'This time overlaps another confirmed booking.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_booking_integrity() from public, anon, authenticated;

drop trigger if exists trg_enforce_booking_integrity on public.bookings;
create trigger trg_enforce_booking_integrity
  before insert or update on public.bookings
  for each row execute function public.enforce_booking_integrity();

-- Consume package credit atomically after confirmation and return it if a
-- confirmed booking is canceled. The row relationship was already validated at
-- insert time and protected from later client mutation above.
create or replace function public.adjust_package_sessions_for_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.package_purchase_id is null then
    return new;
  end if;

  if new.status = 'confirmed' and old.status <> 'confirmed' then
    update public.package_purchases
    set sessions_remaining = sessions_remaining - 1
    where id = new.package_purchase_id
      and client_id = new.client_id
      and trainer_id = new.trainer_id
      and sessions_remaining > 0;

    if not found then
      raise exception using errcode = '23514', message = 'No package sessions remain.';
    end if;
  elsif old.status = 'confirmed' and new.status = 'canceled' then
    update public.package_purchases
    set sessions_remaining = sessions_remaining + 1
    where id = new.package_purchase_id
      and client_id = new.client_id
      and trainer_id = new.trainer_id;
  end if;

  return new;
end;
$$;

revoke all on function public.adjust_package_sessions_for_booking() from public, anon, authenticated;

drop trigger if exists trg_decrement_package_sessions on public.bookings;
drop trigger if exists trg_adjust_package_sessions on public.bookings;
create trigger trg_adjust_package_sessions
  after update of status on public.bookings
  for each row execute function public.adjust_package_sessions_for_booking();

-- Harden the corporate helper functions and aggregate view introduced earlier.
create or replace function public.is_corp_admin(acct_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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
  select exists (
    select 1 from public.corporate_members cm
    where cm.corporate_account_id = acct_id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
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
  where cm.user_id = (select auth.uid()) and cm.status = 'active'
  limit 1;
$$;

create or replace function public.can_view_seat_usage(acct_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_corp_admin(acct_id) or public.is_corp_member(acct_id);
$$;

revoke all on function public.is_corp_admin(uuid) from public, anon;
revoke all on function public.is_corp_member(uuid) from public, anon;
revoke all on function public.my_corp_account_id() from public, anon;
revoke all on function public.can_view_seat_usage(uuid) from public, anon;
grant execute on function public.is_corp_admin(uuid) to authenticated;
grant execute on function public.is_corp_member(uuid) to authenticated;
grant execute on function public.my_corp_account_id() to authenticated;
grant execute on function public.can_view_seat_usage(uuid) to authenticated;

alter view public.corporate_seat_usage set (security_invoker = true);

create or replace function public.is_corp_owner(acct_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.corporate_admins ca
    where ca.corporate_account_id = acct_id
      and ca.user_id = (select auth.uid())
      and ca.role = 'owner'
  );
$$;

revoke all on function public.is_corp_owner(uuid) from public, anon;
grant execute on function public.is_corp_owner(uuid) to authenticated;

-- Avoid recursive RLS on corporate_admins (the old policy queried the same
-- protected table from inside its own predicate).
drop policy if exists corp_admins_manage on public.corporate_admins;
create policy corp_admins_manage
  on public.corporate_admins
  for all
  to authenticated
  using (public.is_corp_owner(corporate_account_id))
  with check (public.is_corp_owner(corporate_account_id));

-- Creating an account and its first owner cannot be expressed safely as two
-- client-side inserts because the account policy requires an owner that does
-- not exist yet. Keep the operation atomic and bind ownership to auth.uid().
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
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
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

revoke all on function public.create_corporate_account(text, text, text, integer) from public, anon;
grant execute on function public.create_corporate_account(text, text, text, integer) to authenticated;

-- Expose only intentional marketplace fields. Joining trainer_profiles to the
-- profiles table from the mobile client either hid trainer names under RLS or
-- required exposing private profile columns (email, phone, push token). This
-- narrowly scoped RPC keeps private identity/payment fields server-side.
create or replace function public.get_trainer_directory(p_trainer_id uuid default null)
returns table (
  user_id uuid,
  full_name text,
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
    and (p_trainer_id is null or tp.user_id = p_trainer_id)
  order by tp.avg_rating desc, p.full_name asc;
$$;

revoke all on function public.get_trainer_directory(uuid) from public, anon;
grant execute on function public.get_trainer_directory(uuid) to authenticated;

-- Return the caller's bookings with display-safe names. This avoids embedded
-- profile joins that are correctly blocked by profile RLS for unrelated users.
create or replace function public.get_my_bookings(p_actor text)
returns table (
  id uuid,
  trainer_id uuid,
  client_id uuid,
  starts_at timestamptz,
  duration_min integer,
  session_type text,
  status text,
  package_purchase_id uuid,
  notes text,
  created_at timestamptz,
  payment_intent_id text,
  payment_status text,
  trainer_name text,
  client_name text,
  trainer_specialty text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.trainer_id,
    b.client_id,
    b.starts_at,
    b.duration_min,
    b.session_type,
    b.status,
    b.package_purchase_id,
    b.notes,
    b.created_at,
    b.payment_intent_id,
    b.payment_status,
    trainer.full_name,
    client.full_name,
    tp.specialties[1]
  from public.bookings b
  join public.profiles trainer on trainer.id = b.trainer_id
  join public.profiles client on client.id = b.client_id
  left join public.trainer_profiles tp on tp.user_id = b.trainer_id
  where (select auth.uid()) is not null
    and (
      (p_actor = 'trainer' and b.trainer_id = (select auth.uid()))
      or (p_actor = 'client' and b.client_id = (select auth.uid()))
    )
  order by b.starts_at asc;
$$;

revoke all on function public.get_my_bookings(text) from public, anon;
grant execute on function public.get_my_bookings(text) to authenticated;
