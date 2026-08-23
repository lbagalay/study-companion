begin;

create table public.pdf_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  material_id uuid not null references public.study_materials(id) on delete cascade,
  page_number integer not null check (page_number between 1 and 50000),
  strokes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pdf_annotations_strokes_array check (jsonb_typeof(strokes) = 'array'),
  constraint pdf_annotations_strokes_limit check (jsonb_array_length(strokes) <= 5000 and pg_column_size(strokes) <= 5242880),
  unique (user_id, material_id, page_number)
);

create index pdf_annotations_material_page_idx on public.pdf_annotations(material_id, page_number);
create trigger pdf_annotations_set_updated_at before update on public.pdf_annotations for each row execute procedure public.set_updated_at();

alter table public.pdf_annotations enable row level security;

create policy "pdf_annotations_select_own" on public.pdf_annotations for select using (
  auth.uid() = user_id
);

create policy "pdf_annotations_insert_own" on public.pdf_annotations for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.study_materials material
    where material.id = pdf_annotations.material_id
      and material.user_id = auth.uid()
      and material.type = 'PDF'
      and material.file_url is not null
      and material.page_count is not null
      and pdf_annotations.page_number <= material.page_count
  )
);

create policy "pdf_annotations_update_own" on public.pdf_annotations for update using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.study_materials material
    where material.id = pdf_annotations.material_id
      and material.user_id = auth.uid()
      and material.type = 'PDF'
      and material.file_url is not null
      and material.page_count is not null
      and pdf_annotations.page_number <= material.page_count
  )
);

create policy "pdf_annotations_delete_own" on public.pdf_annotations for delete using (
  auth.uid() = user_id
);

revoke all on table public.pdf_annotations from anon;
grant select, insert, update, delete on table public.pdf_annotations to authenticated;

commit;
