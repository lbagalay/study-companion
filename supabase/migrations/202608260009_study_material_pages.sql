begin;

create table public.study_material_pages (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.study_materials(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  page_number integer not null check (page_number between 1 and 50000),
  content text not null check (char_length(content) <= 20000),
  created_at timestamptz not null default timezone('utc', now()),
  unique (material_id, page_number)
);

create index study_material_pages_material_idx
on public.study_material_pages(material_id, page_number);

alter table public.study_material_pages enable row level security;

create policy "material_pages_select_own" on public.study_material_pages for select using (
  auth.uid() = user_id
);

create policy "material_pages_insert_own" on public.study_material_pages for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.study_materials material
    where material.id = study_material_pages.material_id
      and material.user_id = auth.uid()
  )
);

create policy "material_pages_delete_own" on public.study_material_pages for delete using (
  auth.uid() = user_id
);

revoke all on table public.study_material_pages from anon;
grant select, insert, delete on table public.study_material_pages to authenticated;

commit;
