begin;

create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  route text not null default '' check (char_length(route) <= 200),
  context_type text not null default 'general' check (char_length(context_type) <= 50),
  context_id uuid,
  material_id uuid references public.study_materials(id) on delete set null,
  page_number integer check (page_number is null or page_number between 1 and 50000),
  created_at timestamptz not null default timezone('utc', now())
);

create index assistant_conversations_user_updated_idx
on public.assistant_conversations(user_id, updated_at desc);

create index assistant_messages_conversation_created_idx
on public.assistant_messages(conversation_id, created_at);

create trigger assistant_conversations_set_updated_at
before update on public.assistant_conversations
for each row execute procedure public.set_updated_at();

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

create policy "assistant_conversations_select_own" on public.assistant_conversations for select using (
  auth.uid() = user_id
);

create policy "assistant_conversations_insert_own" on public.assistant_conversations for insert with check (
  auth.uid() = user_id
);

create policy "assistant_conversations_update_own" on public.assistant_conversations for update using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
);

create policy "assistant_conversations_delete_own" on public.assistant_conversations for delete using (
  auth.uid() = user_id
);

create policy "assistant_messages_select_own" on public.assistant_messages for select using (
  exists (
    select 1 from public.assistant_conversations conversation
    where conversation.id = assistant_messages.conversation_id
      and conversation.user_id = auth.uid()
  )
);

create policy "assistant_messages_insert_own" on public.assistant_messages for insert with check (
  exists (
    select 1 from public.assistant_conversations conversation
    where conversation.id = assistant_messages.conversation_id
      and conversation.user_id = auth.uid()
  )
  and (
    assistant_messages.material_id is null
    or exists (
      select 1 from public.study_materials material
      where material.id = assistant_messages.material_id
        and material.user_id = auth.uid()
    )
  )
);

create policy "assistant_messages_delete_own" on public.assistant_messages for delete using (
  exists (
    select 1 from public.assistant_conversations conversation
    where conversation.id = assistant_messages.conversation_id
      and conversation.user_id = auth.uid()
  )
);

revoke all on table public.assistant_conversations from anon;
revoke all on table public.assistant_messages from anon;
grant select, insert, update, delete on table public.assistant_conversations to authenticated;
grant select, insert, delete on table public.assistant_messages to authenticated;

commit;
