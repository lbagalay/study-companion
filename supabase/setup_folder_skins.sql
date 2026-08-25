-- Run this once in the Supabase SQL Editor to enable custom folder skins
-- (per-subject uploaded images that replace the pattern folder icon).

-- 1. Column to store the storage path of each subject's uploaded skin.
alter table public.subjects
  add column if not exists folder_skin_url text;

-- 2. Public bucket for skin images. Public because these are decorative
--    images rendered constantly across the app (folder grid, sidebar,
--    picker previews) — a public URL avoids re-signing on every render,
--    unlike the private "study-materials" bucket.
insert into storage.buckets (id, name, public)
values ('folder-skins', 'folder-skins', true)
on conflict (id) do update set public = true;

-- 3. RLS: each user may only manage files under their own "<user_id>/..." prefix.
drop policy if exists "folder-skins read" on storage.objects;
create policy "folder-skins read"
  on storage.objects for select
  using (bucket_id = 'folder-skins');

drop policy if exists "folder-skins insert own" on storage.objects;
create policy "folder-skins insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'folder-skins'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "folder-skins update own" on storage.objects;
create policy "folder-skins update own"
  on storage.objects for update
  using (
    bucket_id = 'folder-skins'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "folder-skins delete own" on storage.objects;
create policy "folder-skins delete own"
  on storage.objects for delete
  using (
    bucket_id = 'folder-skins'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
