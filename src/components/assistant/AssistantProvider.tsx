import { usePathname } from 'expo-router';
import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { sendAssistantMessage, streamAssistantMessage } from '@/lib/ai/client';
import type { AssistantActionProposal, AssistantContext as ScreenContext } from '@/lib/ai/types';
import { createClientUuid } from '@/lib/ids';
import { useAuth } from '@/providers/AuthProvider';
import { getActiveConversation, listAssistantMessages } from '@/services/assistant';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  failed?: boolean;
  action?: AssistantActionProposal | null;
};

/** Routes where the assistant must stay out of the way, even if a session exists. */
const HIDDEN_ROUTES = new Set(['/reset-password']);

type AssistantContextValue = {
  visible: boolean;
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  messages: ChatMessage[];
  sending: boolean;
  send: (text: string) => void;
  screenContext: ScreenContext | null;
  setScreenContext: (context: ScreenContext | null) => void;
  route: string;
  startNewChat: () => void;
  openConversation: (conversationId: string) => Promise<void>;
  clearMessageAction: (messageId: string) => void;
};

const Ctx = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [screenContext, setScreenContext] = useState<ScreenContext | null>(null);
  const loadedRef = useRef(false);
  /*
   * `sending` (React state) can't guard against a double-tap: two calls to
   * `send` made in the same tick both close over the pre-update value, so
   * the state check alone wouldn't stop the second one. This ref updates
   * synchronously instead.
   */
  const sendingRef = useRef(false);

  /*
   * A fresh app open always greets with the welcome/suggestions view, even
   * though the student has an ongoing conversation — only the conversation
   * id is restored here (so the assistant still remembers prior context),
   * never the old message bubbles.
   */
  useEffect(() => {
    if (!session || loadedRef.current) return;
    loadedRef.current = true;

    void (async () => {
      try {
        const conversation = await getActiveConversation();
        if (!conversation) return;

        setConversationId(conversation.id);
      } catch {
        // No prior conversation to restore — the sheet just starts fresh.
      }
    })();
  }, [session]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sendingRef.current) return;

      sendingRef.current = true;
      setMessages((prev) => [...prev, { id: createClientUuid(), role: 'user', content: trimmed }]);
      setSending(true);

      const input = { conversationId, message: trimmed, route: pathname, context: screenContext };
      const finish = () => {
        sendingRef.current = false;
        setSending(false);
      };

      /*
       * Streaming reads a response body incrementally, which React Native's
       * fetch does not reliably support on native — so only web gets the
       * live, token-by-token experience. Native keeps the proven
       * request/response path.
       */
      if (Platform.OS === 'web') {
        const assistantId = createClientUuid();
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        const startedAt = Date.now();
        let firstDeltaAt: number | null = null;

        streamAssistantMessage(input, (delta) => {
          if (firstDeltaAt === null) {
            firstDeltaAt = Date.now();
            console.log(`[assistant] first token in ${firstDeltaAt - startedAt}ms`);
          }

          setMessages((prev) =>
            prev.map((entry) =>
              entry.id === assistantId ? { ...entry, content: entry.content + delta } : entry,
            ),
          );
        })
          .then((result) => {
            console.log(`[assistant] full reply in ${Date.now() - startedAt}ms`);
            setConversationId(result.conversationId);
            setMessages((prev) =>
              prev.map((entry) =>
                entry.id === assistantId
                  ? { ...entry, content: result.message, action: result.action }
                  : entry,
              ),
            );
          })
          .catch((error: unknown) => {
            const content =
              error instanceof Error && error.message
                ? error.message
                : 'I could not reach the assistant right now. Please try again in a moment.';
            setMessages((prev) =>
              prev.map((entry) =>
                entry.id === assistantId ? { ...entry, content, failed: true } : entry,
              ),
            );
          })
          .finally(finish);

        return;
      }

      sendAssistantMessage(input)
        .then((result) => {
          setConversationId(result.conversationId);
          setMessages((prev) => [
            ...prev,
            {
              id: createClientUuid(),
              role: 'assistant',
              content: result.message,
              action: result.action,
            },
          ]);
        })
        .catch((error: unknown) => {
          const content =
            error instanceof Error && error.message
              ? error.message
              : 'I could not reach the assistant right now. Please try again in a moment.';
          setMessages((prev) => [
            ...prev,
            { id: createClientUuid(), role: 'assistant', content, failed: true },
          ]);
        })
        .finally(finish);
    },
    [conversationId, pathname, screenContext],
  );

  const startNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, []);

  const openConversation = useCallback(async (id: string) => {
    const rows = await listAssistantMessages(id);
    setConversationId(id);
    setMessages(rows.map((row) => ({ id: row.id, role: row.role, content: row.content })));
  }, []);

  /** Called once an action card is confirmed or cancelled, so it stops rendering as pending. */
  const clearMessageAction = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((entry) => (entry.id === messageId ? { ...entry, action: null } : entry)),
    );
  }, []);

  const value = useMemo<AssistantContextValue>(
    () => ({
      visible: Boolean(session) && !HIDDEN_ROUTES.has(pathname),
      open,
      openSheet: () => setOpen(true),
      closeSheet: () => setOpen(false),
      messages,
      sending,
      send,
      screenContext,
      setScreenContext,
      route: pathname,
      startNewChat,
      openConversation,
      clearMessageAction,
    }),
    [
      session,
      pathname,
      open,
      messages,
      sending,
      send,
      screenContext,
      startNewChat,
      openConversation,
      clearMessageAction,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAssistant() {
  const context = useContext(Ctx);
  if (!context) throw new Error('useAssistant must be used inside AssistantProvider.');
  return context;
}

/**
 * Lets a screen tell the assistant what it's currently looking at.
 * Context clears automatically on unmount so it never leaks into the next screen.
 *
 * `context` should be a stable/memoized value (or primitives spread into deps)
 * — a new object literal on every render will re-run this effect every render.
 */
export function useAssistantScreenContext(context: ScreenContext | null) {
  const { setScreenContext } = useAssistant();

  useEffect(() => {
    setScreenContext(context);
    return () => setScreenContext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);
}
