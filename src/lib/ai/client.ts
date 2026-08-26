import { env } from '@/lib/env';
import { requireSupabaseClient } from '@/lib/supabase/client';
import type { AssistantActionProposal, AssistantContext } from './types';

export type SendAssistantMessageInput = {
  conversationId: string | null;
  message: string;
  route: string;
  context?: AssistantContext | null;
};

export type SendAssistantMessageResult = {
  conversationId: string;
  message: string;
  action: AssistantActionProposal | null;
};

const FALLBACK_ERROR = 'I could not reach the assistant right now. Please try again in a moment.';

async function friendlyMessageFrom(error: unknown): Promise<string> {
  const context = (error as { context?: Response } | null)?.context;

  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) return body.error;
    } catch {
      // Response body was not JSON — fall through to the generic message.
    }
  }

  return FALLBACK_ERROR;
}

function resolveTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Some native Intl implementations lack timezone data — the server
    // just falls back to UTC when this is missing, so it's safe to omit.
    return undefined;
  }
}

function buildRequestBody(input: SendAssistantMessageInput, stream?: boolean) {
  return {
    conversationId: input.conversationId ?? undefined,
    message: input.message,
    route: input.route,
    context: input.context
      ? {
          type: input.context.type,
          id: input.context.id,
          materialId: input.context.materialId,
          page: input.context.page,
        }
      : undefined,
    timezone: resolveTimezone(),
    ...(stream ? { stream: true } : {}),
  };
}

export async function sendAssistantMessage(
  input: SendAssistantMessageInput,
): Promise<SendAssistantMessageResult> {
  const supabase = requireSupabaseClient();

  const { data, error } = await supabase.functions.invoke('assistant', {
    body: buildRequestBody(input),
  });

  if (error) {
    throw new Error(await friendlyMessageFrom(error));
  }

  if (!data || typeof data.message !== 'string' || typeof data.conversationId !== 'string') {
    throw new Error('I did not get a usable response. Please try again.');
  }

  return {
    conversationId: data.conversationId,
    message: data.message,
    action: (data.action as AssistantActionProposal | null) ?? null,
  };
}

/**
 * Web-only streaming variant: bypasses `supabase.functions.invoke` (which
 * always waits for a full response) in favor of a raw `fetch` so incremental
 * text can be read from the assistant edge function as it's generated.
 */
export async function streamAssistantMessage(
  input: SendAssistantMessageInput,
  onDelta: (text: string) => void,
): Promise<SendAssistantMessageResult> {
  const supabase = requireSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  let response: Response;

  try {
    response = await fetch(`${env.supabaseUrl}/functions/v1/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.supabasePublishableKey ?? '',
      },
      body: JSON.stringify(buildRequestBody(input, true)),
    });
  } catch (fetchError) {
    // A raw network failure (offline, CORS, DNS, etc.) throws a browser
    // TypeError like "Failed to fetch" here — never let that leak to the
    // student verbatim.
    console.error('Assistant stream request failed:', fetchError);
    throw new Error(FALLBACK_ERROR);
  }

  if (!response.ok || !response.body) {
    let serverMessage: string | undefined;

    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) serverMessage = body.error;
    } catch {
      // Not a JSON error body — fall back to the generic message below.
    }

    throw new Error(serverMessage ?? FALLBACK_ERROR);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let conversationId: string | null = null;
  let fullText = '';
  let action: AssistantActionProposal | null = null;

  while (true) {
    let readResult: ReadableStreamReadResult<Uint8Array>;

    try {
      readResult = await reader.read();
    } catch (readError) {
      // The connection can drop mid-stream after already receiving good
      // data — same raw-browser-error concern as the initial fetch above.
      console.error('Assistant stream read failed:', readError);
      throw new Error(FALLBACK_ERROR);
    }

    const { done, value } = readResult;
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;

      let payload: {
        type?: string;
        conversationId?: string;
        text?: string;
        message?: string;
        action?: AssistantActionProposal;
      };

      try {
        payload = JSON.parse(jsonStr);
      } catch {
        continue;
      }

      if (payload.type === 'conversation' && payload.conversationId) {
        conversationId = payload.conversationId;
      } else if (payload.type === 'delta' && typeof payload.text === 'string') {
        fullText += payload.text;
        onDelta(payload.text);
      } else if (payload.type === 'action' && payload.action) {
        action = payload.action;
      } else if (payload.type === 'error') {
        throw new Error(payload.message ?? FALLBACK_ERROR);
      }
    }
  }

  if (!conversationId || !fullText.trim()) {
    throw new Error('I did not get a usable response. Please try again.');
  }

  return { conversationId, message: fullText, action };
}
