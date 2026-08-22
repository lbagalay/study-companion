begin;

alter table public.study_materials
  add column file_name text check (file_name is null or char_length(file_name) between 1 and 255),
  add column file_size bigint check (file_size is null or file_size between 1 and 52428800),
  add column page_count integer check (page_count is null or page_count between 1 and 50000),
  add column uploaded_at timestamptz,
  add column last_opened_at timestamptz,
  add column last_read_page integer not null default 1 check (last_read_page between 1 and 50000),
  add constraint study_materials_read_page_within_pdf check (page_count is null or last_read_page <= page_count);

update public.study_materials
set uploaded_at = created_at
where file_url is not null and uploaded_at is null;

create index materials_user_last_opened_pdf_idx
on public.study_materials(user_id, last_opened_at desc)
where type = 'PDF' and file_url is not null;

create or replace function public.update_pdf_reading_progress(
  p_material_id uuid,
  p_page integer,
  p_page_count integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed public.study_materials;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_page_count not between 1 and 50000 or p_page not between 1 and p_page_count then
    raise exception 'Invalid PDF reading position';
  end if;

  update public.study_materials
  set page_count = p_page_count,
      last_read_page = p_page,
      last_opened_at = timezone('utc', now())
  where id = p_material_id
    and user_id = auth.uid()
    and type = 'PDF'
    and file_url is not null
  returning * into changed;

  if changed.id is null then
    raise exception 'PDF material not found';
  end if;

  return jsonb_build_object(
    'last_opened_at', changed.last_opened_at,
    'last_read_page', changed.last_read_page,
    'page_count', changed.page_count
  );
end;
$$;

revoke all on function public.update_pdf_reading_progress(uuid, integer, integer) from public;
revoke execute on function public.update_pdf_reading_progress(uuid, integer, integer) from anon;
grant execute on function public.update_pdf_reading_progress(uuid, integer, integer) to authenticated;

commit;
