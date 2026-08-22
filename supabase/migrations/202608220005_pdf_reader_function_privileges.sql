begin;

revoke all on function public.update_pdf_reading_progress(uuid, integer, integer) from public;
revoke execute on function public.update_pdf_reading_progress(uuid, integer, integer) from anon;
grant execute on function public.update_pdf_reading_progress(uuid, integer, integer) to authenticated;

commit;
