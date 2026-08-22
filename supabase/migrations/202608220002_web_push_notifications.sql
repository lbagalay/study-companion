begin;

create table public.web_push_subscriptions (
  endpoint text primary key check (char_length(endpoint) between 20 and 4096),
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null check (char_length(p256dh) between 20 and 512),
  auth text not null check (char_length(auth) between 8 and 256),
  user_agent text not null default '' check (char_length(user_agent) <= 500),
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index web_push_subscriptions_user_id_idx on public.web_push_subscriptions(user_id);
create trigger web_push_subscriptions_set_updated_at before update on public.web_push_subscriptions for each row execute procedure public.set_updated_at();
alter table public.web_push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.web_push_subscriptions for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.web_push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_update_own" on public.web_push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.web_push_subscriptions for delete using (auth.uid() = user_id);

create or replace function public.register_web_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(p_endpoint) not between 20 and 4096
    or char_length(p_p256dh) not between 20 and 512
    or char_length(p_auth) not between 8 and 256 then
    raise exception 'Invalid push subscription';
  end if;

  insert into public.web_push_subscriptions (endpoint, user_id, p256dh, auth, user_agent, last_seen_at)
  values (p_endpoint, current_user_id, p_p256dh, p_auth, left(coalesce(p_user_agent, ''), 500), timezone('utc', now()))
  on conflict (endpoint) do update set
    user_id = current_user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    last_seen_at = timezone('utc', now());
end;
$$;

create or replace function public.unregister_web_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.web_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke all on function public.register_web_push_subscription(text, text, text, text) from public;
revoke all on function public.unregister_web_push_subscription(text) from public;
grant execute on function public.register_web_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.unregister_web_push_subscription(text) to authenticated;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('ASSIGNMENT', 'EXAM', 'SESSION')),
  source_id uuid not null,
  reminder_offset integer not null check (reminder_offset between 1 and 525600),
  scheduled_for timestamptz not null,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 500),
  target_path text not null check (char_length(target_path) between 1 and 500),
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  claimed_at timestamptz,
  delivered_at timestamptz,
  error text check (char_length(error) <= 1000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, source_type, source_id, reminder_offset, scheduled_for)
);

create index notification_deliveries_claim_idx on public.notification_deliveries(status, scheduled_for) where status <> 'DELIVERED';
create index notification_deliveries_user_id_idx on public.notification_deliveries(user_id, created_at desc);
create trigger notification_deliveries_set_updated_at before update on public.notification_deliveries for each row execute procedure public.set_updated_at();
alter table public.notification_deliveries enable row level security;
create policy "notification_deliveries_select_own" on public.notification_deliveries for select using (auth.uid() = user_id);

create or replace function public.claim_due_web_notifications(p_limit integer default 100)
returns setof public.notification_deliveries
language plpgsql
security definer
set search_path = ''
as $$
begin
  with due_candidates as (
    select a.user_id, 'ASSIGNMENT'::text as source_type, a.id as source_id, offsets.minutes as reminder_offset,
      a.due_at - make_interval(mins => offsets.minutes) as scheduled_for,
      'Activity reminder'::text as title,
      (a.title || ' is due soon. Open Study Companion to check the details.')::text as body,
      ('/assignments/' || a.id)::text as target_path
    from public.assignments a
    join public.profiles p on p.id = a.user_id and p.notifications_enabled
    cross join lateral unnest(a.reminder_offsets) as offsets(minutes)
    where a.status <> 'COMPLETED' and a.due_at > timezone('utc', now())

    union all

    select e.user_id, 'EXAM'::text, e.id, offsets.minutes,
      e.exam_at - make_interval(mins => offsets.minutes),
      (initcap(lower(e.type)) || ' reminder')::text,
      (e.title || ' is coming up. Open Study Companion to review and prepare.')::text,
      ('/exams/' || e.id)::text
    from public.exams e
    join public.profiles p on p.id = e.user_id and p.notifications_enabled
    cross join lateral unnest(e.reminder_offsets) as offsets(minutes)
    where e.status = 'UPCOMING' and e.exam_at > timezone('utc', now())

    union all

    select s.user_id, 'SESSION'::text, s.id, 15,
      s.planned_at - make_interval(mins => 15),
      'Study session soon'::text,
      (s.topic || ' starts in 15 minutes.')::text,
      ('/sessions/' || s.id)::text
    from public.study_sessions s
    join public.profiles p on p.id = s.user_id and p.notifications_enabled
    where s.status in ('PLANNED', 'IN_PROGRESS') and s.planned_at > timezone('utc', now())
  ), latest_due as (
    select distinct on (source_type, source_id)
      user_id, source_type, source_id, reminder_offset, scheduled_for, title, body, target_path
    from due_candidates
    where scheduled_for <= timezone('utc', now())
    order by source_type, source_id, scheduled_for desc
  )
  insert into public.notification_deliveries (user_id, source_type, source_id, reminder_offset, scheduled_for, title, body, target_path)
  select d.user_id, d.source_type, d.source_id, d.reminder_offset, d.scheduled_for, d.title, left(d.body, 500), d.target_path
  from latest_due d
  where exists (select 1 from public.web_push_subscriptions subscription where subscription.user_id = d.user_id)
  on conflict (user_id, source_type, source_id, reminder_offset, scheduled_for) do nothing;

  return query
  with claimable as (
    select delivery.id
    from public.notification_deliveries delivery
    where delivery.attempt_count < 3
      and (
        delivery.status in ('PENDING', 'FAILED')
        or (delivery.status = 'PROCESSING' and delivery.claimed_at < timezone('utc', now()) - interval '10 minutes')
      )
    order by delivery.scheduled_for
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  )
  update public.notification_deliveries delivery
  set status = 'PROCESSING', claimed_at = timezone('utc', now()), attempt_count = delivery.attempt_count + 1, error = null
  from claimable
  where delivery.id = claimable.id
  returning delivery.*;
end;
$$;

revoke all on function public.claim_due_web_notifications(integer) from public;
grant execute on function public.claim_due_web_notifications(integer) to service_role;

commit;
