begin;

alter table public.assignments drop constraint assignments_status_check;

alter table public.assignments
  add constraint assignments_status_check
  check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));

commit;
