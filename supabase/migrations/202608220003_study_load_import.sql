begin;

alter table public.subjects
add column units numeric(4,1) not null default 0 check (units between 0 and 20);

create or replace function public.import_study_load(p_subjects jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  subject_item jsonb;
  schedule_item jsonb;
  resolved_subject_id uuid;
  resolved_color text;
  resolved_start time;
  resolved_end time;
  resolved_day integer;
  subject_count integer := 0;
  schedule_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_subjects is null or jsonb_typeof(p_subjects) <> 'array' then
    raise exception 'Import subjects must be an array';
  end if;

  if jsonb_array_length(p_subjects) < 1 or jsonb_array_length(p_subjects) > 50 then
    raise exception 'Import must contain between 1 and 50 subjects';
  end if;

  for subject_item in select value from jsonb_array_elements(p_subjects)
  loop
    if char_length(btrim(coalesce(subject_item ->> 'name', ''))) not between 1 and 100 then raise exception 'Invalid subject name'; end if;
    if char_length(coalesce(subject_item ->> 'code', '')) > 30 then raise exception 'Invalid subject code'; end if;
    if char_length(coalesce(subject_item ->> 'teacher', '')) > 100 then raise exception 'Invalid teacher'; end if;
    if char_length(coalesce(subject_item ->> 'room', '')) > 50 then raise exception 'Invalid room'; end if;
    if char_length(coalesce(subject_item ->> 'semester', '')) > 50 then raise exception 'Invalid semester'; end if;
    if char_length(coalesce(subject_item ->> 'academic_year', '')) > 20 then raise exception 'Invalid academic year'; end if;
    if coalesce((subject_item ->> 'units')::numeric, 0) not between 0 and 20 then raise exception 'Invalid units'; end if;

    resolved_color := case when coalesce(subject_item ->> 'color', '') ~ '^#[0-9A-Fa-f]{6}$' then subject_item ->> 'color' else '#F26167' end;
    resolved_subject_id := null;
    select subject.id into resolved_subject_id
    from public.subjects subject
    where subject.user_id = current_user_id
      and (
        (btrim(coalesce(subject_item ->> 'code', '')) <> '' and lower(subject.code) = lower(btrim(subject_item ->> 'code')))
        or lower(subject.name) = lower(btrim(subject_item ->> 'name'))
      )
    order by case when lower(subject.code) = lower(btrim(coalesce(subject_item ->> 'code', ''))) then 0 else 1 end
    limit 1;

    if resolved_subject_id is null then
      insert into public.subjects (user_id, name, code, teacher, room, color, semester, academic_year, units)
      values (
        current_user_id,
        btrim(subject_item ->> 'name'),
        btrim(coalesce(subject_item ->> 'code', '')),
        btrim(coalesce(subject_item ->> 'teacher', '')),
        btrim(coalesce(subject_item ->> 'room', '')),
        resolved_color,
        btrim(coalesce(subject_item ->> 'semester', '')),
        btrim(coalesce(subject_item ->> 'academic_year', '')),
        coalesce((subject_item ->> 'units')::numeric, 0)
      ) returning id into resolved_subject_id;
      subject_count := subject_count + 1;
    else
      update public.subjects subject set
        teacher = case when subject.teacher = '' then btrim(coalesce(subject_item ->> 'teacher', '')) else subject.teacher end,
        room = case when subject.room = '' then btrim(coalesce(subject_item ->> 'room', '')) else subject.room end,
        semester = case when subject.semester = '' then btrim(coalesce(subject_item ->> 'semester', '')) else subject.semester end,
        academic_year = case when subject.academic_year = '' then btrim(coalesce(subject_item ->> 'academic_year', '')) else subject.academic_year end,
        units = case when subject.units = 0 then coalesce((subject_item ->> 'units')::numeric, 0) else subject.units end
      where subject.id = resolved_subject_id and subject.user_id = current_user_id;
    end if;

    if jsonb_typeof(coalesce(subject_item -> 'schedules', '[]'::jsonb)) <> 'array' then
      raise exception 'Invalid schedules';
    end if;

    if jsonb_array_length(coalesce(subject_item -> 'schedules', '[]'::jsonb)) > 20 then
      raise exception 'Each subject may contain at most 20 schedules';
    end if;
    for schedule_item in select value from jsonb_array_elements(coalesce(subject_item -> 'schedules', '[]'::jsonb))
    loop
      resolved_day := (schedule_item ->> 'day_of_week')::integer;
      resolved_start := (schedule_item ->> 'start_time')::time;
      resolved_end := (schedule_item ->> 'end_time')::time;
      if resolved_day not between 0 and 6 or resolved_end <= resolved_start then raise exception 'Invalid class meeting'; end if;
      if char_length(coalesce(schedule_item ->> 'room', '')) > 50 then raise exception 'Invalid schedule room'; end if;

      if not exists (
        select 1 from public.class_schedules existing
        where existing.user_id = current_user_id and existing.subject_id = resolved_subject_id
          and existing.day_of_week = resolved_day and existing.start_time = resolved_start and existing.end_time = resolved_end
      ) then
        insert into public.class_schedules (user_id, subject_id, day_of_week, start_time, end_time, room)
        values (current_user_id, resolved_subject_id, resolved_day, resolved_start, resolved_end, btrim(coalesce(nullif(schedule_item ->> 'room', ''), subject_item ->> 'room', '')));
        schedule_count := schedule_count + 1;
      end if;
    end loop;
  end loop;

  return jsonb_build_object('subjects_created', subject_count, 'schedules_created', schedule_count);
end;
$$;

revoke all on function public.import_study_load(jsonb) from public;
grant execute on function public.import_study_load(jsonb) to authenticated;

commit;
