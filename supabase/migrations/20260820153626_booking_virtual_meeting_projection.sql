drop function if exists public.get_my_bookings(text);
create function public.get_my_bookings(p_actor text)
returns table(
  id uuid, trainer_id uuid, client_id uuid, starts_at timestamptz, duration_min integer,
  session_type text, status text, package_purchase_id uuid, notes text, created_at timestamptz,
  payment_intent_id text, payment_status text, trainer_name text, client_name text, trainer_specialty text,
  virtual_meeting_provider text, virtual_meeting_url text, virtual_meeting_external_id text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id, b.trainer_id, b.client_id, b.starts_at, b.duration_min, b.session_type, b.status,
    b.package_purchase_id, b.notes, b.created_at, b.payment_intent_id, b.payment_status,
    trainer.full_name, client.full_name, tp.specialties[1],
    b.virtual_meeting_provider, b.virtual_meeting_url, b.virtual_meeting_external_id
  from public.bookings b
  join public.profiles trainer on trainer.id = b.trainer_id
  join public.profiles client on client.id = b.client_id
  left join public.trainer_profiles tp on tp.user_id = b.trainer_id
  where (select auth.uid()) is not null
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    and (
      (p_actor = 'trainer' and b.trainer_id = (select auth.uid()))
      or (p_actor = 'client' and b.client_id = (select auth.uid()))
    )
  order by b.starts_at asc;
$$;
revoke all on function public.get_my_bookings(text) from public, anon;
grant execute on function public.get_my_bookings(text) to authenticated;
