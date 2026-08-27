begin;

-- Blank-canvas quick notes: a study material with no file, annotated with
-- the same ink tools as a PDF page (materialId + a single page_number).

alter table public.study_materials drop constraint study_materials_type_check;

alter table public.study_materials
  add constraint study_materials_type_check
  check (type in ('PDF', 'IMAGE', 'DOCUMENT', 'LINK', 'VIDEO_LINK', 'NOTE', 'CANVAS', 'OTHER'));

alter table public.study_materials drop constraint study_materials_check;

alter table public.study_materials
  add constraint study_materials_check
  check (file_url is not null or external_url is not null or type in ('NOTE', 'CANVAS'));

drop policy "pdf_annotations_insert_own" on public.pdf_annotations;

create policy "pdf_annotations_insert_own" on public.pdf_annotations for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.study_materials material
    where material.id = pdf_annotations.material_id
      and material.user_id = auth.uid()
      and material.type in ('PDF', 'CANVAS')
      and (material.type <> 'PDF' or material.file_url is not null)
      and material.page_count is not null
      and pdf_annotations.page_number <= material.page_count
  )
);

drop policy "pdf_annotations_update_own" on public.pdf_annotations;

create policy "pdf_annotations_update_own" on public.pdf_annotations for update using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.study_materials material
    where material.id = pdf_annotations.material_id
      and material.user_id = auth.uid()
      and material.type in ('PDF', 'CANVAS')
      and (material.type <> 'PDF' or material.file_url is not null)
      and material.page_count is not null
      and pdf_annotations.page_number <= material.page_count
  )
);

commit;
