-- Profile photo support for TrainerHub.
-- Adds a public avatar URL to profiles and a tightly scoped public Storage bucket.

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket means reads are intentionally public. Only the authenticated
-- owner may create, replace, or delete the object under <user-id>/profile.
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Extend the privacy-safe trainer directory RPC with the public avatar URL.
drop function if exists public.get_trainer_directory(uuid);
create function public.get_trainer_directory(p_trainer_id uuid default null)
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
