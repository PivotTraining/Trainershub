create or replace function public.get_public_trainer_directory(p_trainer_id uuid default null)
returns table (
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
    coalesce(tp.specialties, '{}'::text[]),
    tp.hourly_rate_cents,
    tp.location,
    coalesce(tp.session_types, '{}'::text[]),
    coalesce(tp.languages, '{}'::text[]),
    coalesce(tp.vibe_tags, '{}'::text[]),
    coalesce(tp.instant_book, false),
    coalesce(tp.cancellation_hours, 24),
    tp.video_intro_url,
    coalesce(tp.avg_rating, 0),
    coalesce(tp.review_count, 0),
    coalesce(tp.is_verified, false)
  from public.trainer_profiles tp
  join public.profiles p on p.id = tp.user_id
  where p_trainer_id is null or tp.user_id = p_trainer_id
  order by coalesce(tp.avg_rating, 0) desc, p.full_name asc;
$$;

revoke all on function public.get_public_trainer_directory(uuid) from public;
grant execute on function public.get_public_trainer_directory(uuid) to anon, authenticated, service_role;
