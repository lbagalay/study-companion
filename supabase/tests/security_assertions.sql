-- Run after applying migrations, either in Supabase SQL Editor or after `supabase db reset`.
do $$
declare
  missing_rls text[];
  policy_count integer;
  bucket_is_public boolean;
begin
  select array_agg(c.relname order by c.relname)
  into missing_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array['profiles', 'subjects', 'class_schedules', 'assignments', 'exams', 'study_materials', 'notes', 'study_sessions'])
    and not c.relrowsecurity;

  if missing_rls is not null then
    raise exception 'RLS is disabled for: %', array_to_string(missing_rls, ', ');
  end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any(array['profiles', 'subjects', 'class_schedules', 'assignments', 'exams', 'study_materials', 'notes', 'study_sessions']);

  if policy_count <> 30 then
    raise exception 'Expected 30 public-table policies, found %', policy_count;
  end if;

  select public into bucket_is_public from storage.buckets where id = 'study-materials';
  if bucket_is_public is null then
    raise exception 'study-materials bucket is missing';
  end if;
  if bucket_is_public then
    raise exception 'study-materials bucket must be private';
  end if;

  if (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'material_files_%_own') <> 4 then
    raise exception 'Expected four per-user storage policies';
  end if;
end;
$$;
