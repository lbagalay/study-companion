begin;

-- Re-asserts every RPC function's privileges. Supabase grants EXECUTE on public-schema
-- functions directly to `anon`/`authenticated` by default (not via the PUBLIC pseudo-role),
-- so `revoke all ... from public` alone never touches that direct grant — each role that
-- should NOT be able to call a function needs an explicit `revoke execute ... from <role>`.
-- `202608220005_pdf_reader_function_privileges.sql` already did this correctly for
-- update_pdf_reading_progress; the other RPC functions never got the same treatment.

revoke all on function public.register_web_push_subscription(text, text, text, text) from public;
revoke execute on function public.register_web_push_subscription(text, text, text, text) from anon;
grant execute on function public.register_web_push_subscription(text, text, text, text) to authenticated;

revoke all on function public.unregister_web_push_subscription(text) from public;
revoke execute on function public.unregister_web_push_subscription(text) from anon;
grant execute on function public.unregister_web_push_subscription(text) to authenticated;

revoke all on function public.claim_due_web_notifications(integer) from public;
revoke execute on function public.claim_due_web_notifications(integer) from anon;
revoke execute on function public.claim_due_web_notifications(integer) from authenticated;
grant execute on function public.claim_due_web_notifications(integer) to service_role;

revoke all on function public.import_study_load(jsonb) from public;
revoke execute on function public.import_study_load(jsonb) from anon;
grant execute on function public.import_study_load(jsonb) to authenticated;

revoke all on function public.update_pdf_reading_progress(uuid, integer, integer) from public;
revoke execute on function public.update_pdf_reading_progress(uuid, integer, integer) from anon;
grant execute on function public.update_pdf_reading_progress(uuid, integer, integer) to authenticated;

commit;
