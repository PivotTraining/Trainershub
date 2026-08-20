create or replace function public.get_public_trainer_reviews(p_trainer_id uuid)
returns table (
  id uuid,
  trainer_id uuid,
  rating integer,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.trainer_id, r.rating, r.body, r.created_at
  from public.reviews r
  where r.trainer_id = p_trainer_id
  order by r.created_at desc
  limit 20;
$$;

revoke all on function public.get_public_trainer_reviews(uuid) from public;
grant execute on function public.get_public_trainer_reviews(uuid) to anon, authenticated, service_role;

alter policy "anyone can view reviews" on public.reviews to authenticated using (true);
