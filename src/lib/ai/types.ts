export type AssistantContextType =
  | 'home'
  | 'schedule'
  | 'task'
  | 'assessment'
  | 'subject'
  | 'study_material'
  | 'pdf'
  | 'note'
  | 'general';

/**
 * What a screen tells the assistant about what the student is looking at.
 * `label` is display-only (used in the sheet header) and never trusted by the
 * server as proof of anything — the server re-derives and validates context
 * from `type`/`id` against the authenticated user's own data.
 */
export type AssistantContext = {
  type: AssistantContextType;
  id?: string;
  materialId?: string;
  page?: number;
  label?: string;
};

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  failed?: boolean;
};

/**
 * A proposed write action the assistant wants to take, requiring explicit
 * confirmation before anything is actually saved. The server only ever
 * proposes these (via Gemini function-calling) — the mutation itself runs
 * through the app's own already-authenticated code once the student taps
 * Confirm (see AssistantActionCard.tsx). Gemini never writes to the database.
 */
export type AssistantActionProposal =
  | { type: 'MARK_TASK_COMPLETE'; taskId: string; label: string }
  | { type: 'CREATE_TASK'; title: string; dueAt: string | null; notes: string; label: string };
