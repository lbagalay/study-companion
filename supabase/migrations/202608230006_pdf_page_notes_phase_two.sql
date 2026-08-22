begin;

alter table public.notes
  alter column title drop not null,
  add column material_id uuid references public.study_materials(id) on delete cascade,
  add column page_number integer,
  add constraint notes_page_number_check check (page_number is null or page_number between 1 and 50000),
  add constraint notes_scope_check check (material_id is not null or (title is not null and page_number is null)),
  add constraint notes_pdf_content_check check (material_id is null or char_length(btrim(content)) between 1 and 50000);

create index notes_material_page_updated_idx
on public.notes(material_id, page_number, updated_at desc)
where material_id is not null;

drop policy "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.subjects
    where id = notes.subject_id and user_id = auth.uid()
  )
  and (
    (notes.material_id is null and notes.page_number is null)
    or exists (
      select 1
      from public.study_materials material
      where material.id = notes.material_id
        and material.user_id = auth.uid()
        and material.subject_id = notes.subject_id
        and material.type = 'PDF'
        and material.file_url is not null
        and material.page_count is not null
        and (notes.page_number is null or notes.page_number <= material.page_count)
    )
  )
);

drop policy "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes for update using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.subjects
    where id = notes.subject_id and user_id = auth.uid()
  )
  and (
    (notes.material_id is null and notes.page_number is null)
    or exists (
      select 1
      from public.study_materials material
      where material.id = notes.material_id
        and material.user_id = auth.uid()
        and material.subject_id = notes.subject_id
        and material.type = 'PDF'
        and material.file_url is not null
        and material.page_count is not null
        and (notes.page_number is null or notes.page_number <= material.page_count)
    )
  )
);

commit;
