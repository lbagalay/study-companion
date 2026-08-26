import { requireSupabaseClient } from '@/lib/supabase/client';
import { check } from './index';

export type StoredAssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

/** MVP keeps a single active conversation per user — the most recently updated one. */
export async function getActiveConversation() {
  const { data, error } = await requireSupabaseClient()
    .from('assistant_conversations')
    .select('id,title,updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error);
  return data;
}

export async function listAssistantMessages(conversationId: string) {
  const { data, error } = await requireSupabaseClient()
    .from('assistant_messages')
    .select('id,role,content,created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  check(error);
  return (data ?? []) as StoredAssistantMessage[];
}

export async function listConversations() {
  const { data, error } = await requireSupabaseClient()
    .from('assistant_conversations')
    .select('id,title,updated_at')
    .order('updated_at', { ascending: false });
  check(error);
  return data ?? [];
}
