begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  preferred_name text not null default '',
  avatar_url text,
  theme text not null default 'SYSTEM' check (theme in ('SYSTEM', 'LIGHT', 'DARK')),
  theme_color text not null default '#4F6F52',
  timezone text not null default 'Asia/Manila',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, preferred_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'preferred_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  code text not null default '' check (char_length(code) <= 30),
  description text not null default '' check (char_length(description) <= 1000),
  teacher text not null default '' check (char_length(teacher) <= 100),
  room text not null default '' check (char_length(room) <= 50),
  color text not null default '#4F6F52',
  semester text not null default '' check (char_length(semester) <= 50),
  academic_year text not null default '' check (char_length(academic_year) <= 20),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  room text not null default '' check (char_length(room) <= 50),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_time > start_time)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  description text not null default '' check (char_length(description) <= 3000),
  due_at timestamptz not null,
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status text not null default 'NOT_STARTED' check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  attachment_url text,
  notes text not null default '' check (char_length(notes) <= 3000),
  reminder_offsets integer[] not null default array[1440, 180, 60],
  notification_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  type text not null default 'EXAM' check (type in ('QUIZ', 'EXAM', 'MIDTERM', 'FINAL', 'PRACTICAL', 'PRESENTATION', 'OTHER')),
  exam_at timestamptz not null,
  room text not null default '' check (char_length(room) <= 50),
  coverage text not null default '' check (char_length(coverage) <= 5000),
  notes text not null default '' check (char_length(notes) <= 3000),
  status text not null default 'UPCOMING' check (status in ('UPCOMING', 'COMPLETED', 'CANCELLED')),
  reminder_offsets integer[] not null default array[10080, 4320, 1440],
  notification_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  description text not null default '' check (char_length(description) <= 3000),
  type text not null default 'OTHER' check (type in ('PDF', 'IMAGE', 'DOCUMENT', 'LINK', 'VIDEO_LINK', 'NOTE', 'OTHER')),
  file_url text,
  external_url text,
  favorite boolean not null default false,
  completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (file_url is not null or external_url is not null or type = 'NOTE')
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  content text not null default '' check (char_length(content) <= 50000),
  favorite boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete set null,
  topic text not null check (char_length(topic) between 1 and 300),
  planned_at timestamptz not null,
  planned_duration integer not null default 30 check (planned_duration between 5 and 480),
  actual_duration integer check (actual_duration between 0 and 1440),
  status text not null default 'PLANNED' check (status in ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
  notes text not null default '' check (char_length(notes) <= 3000),
  notification_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index subjects_user_id_idx on public.subjects(user_id);
create index schedules_user_day_time_idx on public.class_schedules(user_id, day_of_week, start_time);
create index schedules_subject_id_idx on public.class_schedules(subject_id);
create index assignments_user_due_idx on public.assignments(user_id, due_at);
create index assignments_subject_id_idx on public.assignments(subject_id);
create index assignments_user_status_idx on public.assignments(user_id, status);
create index exams_user_date_idx on public.exams(user_id, exam_at);
create index exams_subject_id_idx on public.exams(subject_id);
create index materials_user_created_idx on public.study_materials(user_id, created_at desc);
create index materials_subject_id_idx on public.study_materials(subject_id);
create index notes_user_updated_idx on public.notes(user_id, updated_at desc);
create index notes_subject_id_idx on public.notes(subject_id);
create index sessions_user_planned_idx on public.study_sessions(user_id, planned_at);
create index sessions_subject_id_idx on public.study_sessions(subject_id);
create index sessions_exam_id_idx on public.study_sessions(exam_id);

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger subjects_set_updated_at before update on public.subjects for each row execute procedure public.set_updated_at();
create trigger schedules_set_updated_at before update on public.class_schedules for each row execute procedure public.set_updated_at();
create trigger assignments_set_updated_at before update on public.assignments for each row execute procedure public.set_updated_at();
create trigger exams_set_updated_at before update on public.exams for each row execute procedure public.set_updated_at();
create trigger materials_set_updated_at before update on public.study_materials for each row execute procedure public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes for each row execute procedure public.set_updated_at();
create trigger sessions_set_updated_at before update on public.study_sessions for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.class_schedules enable row level security;
alter table public.assignments enable row level security;
alter table public.exams enable row level security;
alter table public.study_materials enable row level security;
alter table public.notes enable row level security;
alter table public.study_sessions enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "subjects_select_own" on public.subjects for select using (auth.uid() = user_id);
create policy "subjects_insert_own" on public.subjects for insert with check (auth.uid() = user_id);
create policy "subjects_update_own" on public.subjects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subjects_delete_own" on public.subjects for delete using (auth.uid() = user_id);

create policy "schedules_select_own" on public.class_schedules for select using (auth.uid() = user_id);
create policy "schedules_insert_own" on public.class_schedules for insert with check (
  auth.uid() = user_id and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
create policy "schedules_update_own" on public.class_schedules for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
create policy "schedules_delete_own" on public.class_schedules for delete using (auth.uid() = user_id);

create policy "assignments_select_own" on public.assignments for select using (auth.uid() = user_id);
create policy "assignments_insert_own" on public.assignments for insert with check (
  auth.uid() = user_id and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
create policy "assignments_update_own" on public.assignments for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
create policy "assignments_delete_own" on public.assignments for delete using (auth.uid() = user_id);

create policy "exams_select_own" on public.exams for select using (auth.uid() = user_id);
create policy "exams_insert_own" on public.exams for insert with check (
  auth.uid() = user_id and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
create policy "exams_update_own" on public.exams for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
create policy "exams_delete_own" on public.exams for delete using (auth.uid() = user_id);

create policy "materials_select_own" on public.study_materials for select using (auth.uid() = user_id);
create policy "materials_insert_own" on public.study_materials for insert with check (
  auth.uid() = user_id and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
create policy "materials_update_own" on public.study_materials for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
create policy "materials_delete_own" on public.study_materials for delete using (auth.uid() = user_id);

create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert with check (
  auth.uid() = user_id and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
create policy "notes_update_own" on public.notes for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);

create policy "sessions_select_own" on public.study_sessions for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.study_sessions for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
  and (exam_id is null or exists (select 1 from public.exams where id = exam_id and user_id = auth.uid()))
);
create policy "sessions_update_own" on public.study_sessions for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
  and (exam_id is null or exists (select 1 from public.exams where id = exam_id and user_id = auth.uid()))
);
create policy "sessions_delete_own" on public.study_sessions for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('study-materials', 'study-materials', false, 52428800)
on conflict (id) do nothing;

create policy "material_files_select_own" on storage.objects for select to authenticated
using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "material_files_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "material_files_update_own" on storage.objects for update to authenticated
using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "material_files_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
