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
    and c.relname = any(array['profiles', 'subjects', 'class_schedules', 'assignments', 'exams', 'study_materials', 'notes', 'pdf_annotations', 'study_sessions', 'web_push_subscriptions', 'notification_deliveries', 'assistant_conversations', 'assistant_messages', 'study_material_pages'])
    and not c.relrowsecurity;

  if missing_rls is not null then
    raise exception 'RLS is disabled for: %', array_to_string(missing_rls, ', ');
  end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any(array['profiles', 'subjects', 'class_schedules', 'assignments', 'exams', 'study_materials', 'notes', 'pdf_annotations', 'study_sessions', 'web_push_subscriptions', 'notification_deliveries', 'assistant_conversations', 'assistant_messages', 'study_material_pages']);

  if policy_count <> 49 then
    raise exception 'Expected 49 public-table policies, found %', policy_count;
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

  if has_function_privilege('anon', 'public.register_web_push_subscription(text,text,text,text)', 'execute') then
    raise exception 'Anonymous users must not register Web Push subscriptions';
  end if;
  if not has_function_privilege('authenticated', 'public.register_web_push_subscription(text,text,text,text)', 'execute') then
    raise exception 'Authenticated users must be able to register Web Push subscriptions';
  end if;
  if has_function_privilege('authenticated', 'public.claim_due_web_notifications(integer)', 'execute') then
    raise exception 'Authenticated users must not claim reminder deliveries';
  end if;
  if not has_function_privilege('service_role', 'public.claim_due_web_notifications(integer)', 'execute') then
    raise exception 'The service role must be able to claim reminder deliveries';
  end if;
  if has_function_privilege('anon', 'public.import_study_load(jsonb)', 'execute') then
    raise exception 'Anonymous users must not import study loads';
  end if;
  if not has_function_privilege('authenticated', 'public.import_study_load(jsonb)', 'execute') then
    raise exception 'Authenticated users must be able to import study loads';
  end if;
  if has_function_privilege('anon', 'public.update_pdf_reading_progress(uuid,integer,integer)', 'execute') then
    raise exception 'Anonymous users must not update PDF reading progress';
  end if;
  if not has_function_privilege('authenticated', 'public.update_pdf_reading_progress(uuid,integer,integer)', 'execute') then
    raise exception 'Authenticated users must be able to update their PDF reading progress';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notes' and column_name = 'material_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notes' and column_name = 'page_number'
  ) then
    raise exception 'PDF page-note linkage columns are missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pdf_annotations' and column_name = 'strokes' and data_type = 'jsonb'
  ) then
    raise exception 'Private per-page PDF annotation storage is missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'assistant_messages' and column_name = 'context_type'
  ) then
    raise exception 'Assistant message context columns are missing';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'assistant_messages' and column_name = 'user_id'
  ) then
    raise exception 'assistant_messages must derive ownership from its conversation, not its own user_id';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.study_material_pages'::regclass and contype = 'u'
  ) then
    raise exception 'study_material_pages must have a unique (material_id, page_number) constraint to dedupe cached PDF text';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_material_pages' and cmd = 'UPDATE'
  ) then
    raise exception 'study_material_pages is insert-only cache storage and must not be updatable';
  end if;
end;
$$;
