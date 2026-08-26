import { createClient } from 'npm:@supabase/supabase-js@2';

const CONTEXT_TYPES = new Set([
  'home',
  'schedule',
  'task',
  'assessment',
  'subject',
  'study_material',
  'pdf',
  'note',
  'general',
]);

const MAX_MESSAGE_LENGTH = 4000;
const MAX_ROUTE_LENGTH = 200;
const HISTORY_LIMIT = 6;
const MAX_HISTORY_MESSAGE_CHARS = 500;
const MAX_OUTPUT_TOKENS = 800;
const CUTOFF_NOTICE = '\n\n(That answer was cut short by a length limit — ask me to continue.)';

/**
 * The previous attempt to cut the ~11s "thinking" delay used
 * `thinkingConfig.thinkingBudget` — a Gemini 2.5-era field name — and got a
 * 400 back. Gemini 3 models (gemini-3.6-flash is one) use
 * `thinkingConfig.thinkingLevel` instead; Gemini 3 Flash doesn't support
 * fully disabling thinking, but `minimal` is documented as the
 * lowest-latency level. If this model rejects it too, drop thinkingConfig
 * entirely — the Gemini error logs will show a 400 either way.
 */
const GENERATION_CONFIG = {
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  temperature: 0.6,
  thinkingConfig: { thinkingLevel: 'minimal' },
};

const SYSTEM_PROMPT = `You are the Study Assistant built into a student's personal Study Companion app.

Your visual persona is a warm teddy bear, but your written responses should remain clear, natural, useful, and concise.

You may receive context about the screen the student is currently viewing and data from their account. A separate "upcoming tasks and assessments" list and a "weekly class schedule" may also be included — both reflect the student's real data regardless of what screen they're on, so use them for schedule/deadline/free-period questions even if the current screen is unrelated (a PDF, home, etc.). The weekly schedule repeats every week — use the student's current weekday and local time (given below) to reason about what's happening now, what's next, free periods, or the busiest day.

When app data is provided:
- treat it as the source of truth
- never invent schedules, assignments, assessments, materials, notes, or deadlines
- use current screen context when relevant
- answer the student's actual question
- use exact dates and times when useful
- explain school topics clearly
- when material context is supplied, ground summaries and quizzes in that material
- clearly say when required information is unavailable
- be supportive without being childish or overly emotional
- keep everyday answers short (2-4 sentences) unless the student asks for more detail or a full walkthrough

You may recommend actions, but do not claim that you changed app data unless the application explicitly confirms that the action was completed.

You are read-only by default: you can read, explain, summarize, compare, recommend, and quiz, but you must never claim to have created, deleted, or changed something yourself. When tools are available to you (for marking a task complete or proposing a new task), calling one only shows the student a confirmation card — it does not save anything by itself. Only call a tool when the student clearly and explicitly asks for that specific action; never call one speculatively, and never call one just because it's available. If you're unsure which task/assignment the student means, ask instead of guessing or calling a tool.

When asked to generate a quiz: default to around 5 questions unless the student asks for a different amount, and use multiple choice, true/false, identification, or short answer as appropriate — ground every question in the material/notes actually provided, never invent facts.

When asked to make flashcards: return them directly in the chat as simple front/back pairs. Do not claim they were saved anywhere unless the application confirms that.

When asked what to prioritize: default to this order unless the student's own data suggests otherwise — (1) overdue work, (2) tasks due today, (3) quizzes/exams happening very soon, (4) assignments due soon, (5) lower-priority future work — and briefly explain why you're recommending that order.`;

type AssistantContext = {
  type?: string;
  id?: string;
  materialId?: string;
  page?: number;
};

type RequestBody = {
  conversationId?: string;
  message?: string;
  route?: string;
  context?: AssistantContext;
  stream?: boolean;
  timezone?: string;
};

type MessageRow = {
  role: 'user' | 'assistant';
  content: string;
};

type GeminiContent = { role: string; parts: { text: string }[] };

type SupabaseClient = ReturnType<typeof createClient>;

function required(name: string) {
  const value = Deno.env.get(name);

  if (!value) throw new Error(`Missing ${name}`);

  return value;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function friendlyError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: CORS_HEADERS });
}

function supabaseUrl() {
  return Deno.env.get('SUPABASE_URL') ?? required('SUPABASE_URL');
}

function anonKey() {
  return (
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
    required('SUPABASE_ANON_KEY')
  );
}

/**
 * The Functions gateway already verifies this JWT's signature and expiry
 * before our handler ever runs (`verify_jwt` defaults to true and is not
 * overridden for this function in supabase/config.toml). So we only need
 * to read the `sub` claim, not re-verify it — calling `auth.getUser()`
 * here would just be a second, redundant network round trip to the Auth
 * server on every single message. If `verify_jwt` is ever disabled for
 * this function, this shortcut becomes unsafe and must be reverted to a
 * real `auth.getUser()` check.
 */
function userIdFromVerifiedJwt(authHeader: string): string | null {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const segment = token.split('.')[1];
  if (!segment) return null;

  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { sub?: string; exp?: number };

    if (typeof payload.sub !== 'string') return null;
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null;

    return payload.sub;
  } catch {
    return null;
  }
}

const MAX_CONTEXT_FIELD_CHARS = 400;
const MAX_NOTE_CONTENT_CHARS = 1500;
const MAX_PDF_PAGE_CHARS = 3000;
const MAX_PAGE_RANGE_SPAN = 20;
const MAX_PAGE_RANGE_CHARS = 6000;

/** Matches "pages 20-30", "page 20 to 30", "pp. 20–30", etc. */
function parsePageRange(message: string): { start: number; end: number } | null {
  const match = message.match(/pages?\s*(\d{1,4})\s*(?:-|–|—|to|through)\s*(\d{1,4})/i);
  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) return null;

  return { start, end: Math.min(end, start + MAX_PAGE_RANGE_SPAN - 1) };
}
// Matches src/components/schedule/ScheduleForm.tsx's `days` array (day_of_week 0 = Sunday).
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function truncateField(
  value: string | null | undefined,
  maxChars = MAX_CONTEXT_FIELD_CHARS,
): string | undefined {
  if (!value) return undefined;

  return value.length > maxChars ? `${value.slice(0, maxChars)}…` : value;
}

type SubjectRef = { name: string } | null;

type TaskContextRow = {
  title: string;
  description: string | null;
  due_at: string;
  priority: string;
  status: string;
  subject: SubjectRef;
};

type AssessmentContextRow = {
  title: string;
  type: string;
  exam_at: string;
  room: string;
  coverage: string;
  notes: string;
  status: string;
  subject: SubjectRef;
};

type ScheduleContextRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
  subject: SubjectRef;
};

type SubjectContextRow = {
  name: string;
  code: string;
  description: string;
  teacher: string;
  room: string;
  semester: string;
  academic_year: string;
};

type NoteContextRow = {
  title: string;
  content: string;
  subject: SubjectRef;
};

type MaterialContextRow = {
  title: string;
  description: string;
  type: string;
  favorite: boolean;
  completed: boolean;
  subject: SubjectRef;
};

function formatTaskContext(row: TaskContextRow | null): string | null {
  if (!row) return null;

  const lines = [
    `Task: "${row.title}"`,
    `Status: ${row.status}`,
    `Priority: ${row.priority}`,
    `Due: ${row.due_at}`,
  ];

  if (row.subject?.name) lines.push(`Subject: ${row.subject.name}`);
  const description = truncateField(row.description);
  if (description) lines.push(`Description: ${description}`);

  return lines.join('\n');
}

function formatAssessmentContext(row: AssessmentContextRow | null): string | null {
  if (!row) return null;

  const lines = [
    `Assessment: "${row.title}" (${row.type})`,
    `Status: ${row.status}`,
    `Date: ${row.exam_at}`,
  ];

  if (row.subject?.name) lines.push(`Subject: ${row.subject.name}`);
  if (row.room) lines.push(`Room: ${row.room}`);
  const coverage = truncateField(row.coverage);
  if (coverage) lines.push(`Coverage: ${coverage}`);
  const notes = truncateField(row.notes);
  if (notes) lines.push(`Notes: ${notes}`);

  return lines.join('\n');
}

function formatScheduleContext(row: ScheduleContextRow | null): string | null {
  if (!row) return null;

  const day = WEEKDAY_NAMES[row.day_of_week] ?? `Day ${row.day_of_week}`;
  const lines = ['Class schedule entry', `Day: ${day}`, `Time: ${row.start_time}–${row.end_time}`];

  if (row.subject?.name) lines.push(`Subject: ${row.subject.name}`);
  if (row.room) lines.push(`Room: ${row.room}`);

  return lines.join('\n');
}

function formatSubjectContext(row: SubjectContextRow | null): string | null {
  if (!row) return null;

  const lines = [`Subject: "${row.name}"`];

  if (row.code) lines.push(`Code: ${row.code}`);
  if (row.teacher) lines.push(`Teacher: ${row.teacher}`);
  if (row.room) lines.push(`Room: ${row.room}`);

  const term = [row.semester, row.academic_year].filter(Boolean).join(' ');
  if (term) lines.push(`Term: ${term}`);

  const description = truncateField(row.description);
  if (description) lines.push(`Description: ${description}`);

  return lines.join('\n');
}

function formatNoteContext(row: NoteContextRow | null): string | null {
  if (!row) return null;

  const lines = [`Note: "${row.title}"`];

  if (row.subject?.name) lines.push(`Subject: ${row.subject.name}`);
  const content = truncateField(row.content, MAX_NOTE_CONTENT_CHARS);
  if (content) lines.push(`Content: ${content}`);

  return lines.join('\n');
}

function formatMaterialContext(row: MaterialContextRow | null): string | null {
  if (!row) return null;

  const lines = [`Study material: "${row.title}" (${row.type})`];

  if (row.subject?.name) lines.push(`Subject: ${row.subject.name}`);
  lines.push(
    `Status: ${row.completed ? 'marked complete' : 'not completed yet'}${row.favorite ? ', favorited' : ''}`,
  );
  const description = truncateField(row.description);
  if (description) lines.push(`Description: ${description}`);

  return lines.join('\n');
}

const MAX_UPCOMING_ITEMS = 5;

type UpcomingTaskRow = {
  title: string;
  due_at: string;
  priority: string;
  subject: SubjectRef;
};

type UpcomingAssessmentRow = {
  title: string;
  type: string;
  exam_at: string;
  subject: SubjectRef;
};

/**
 * "Do I have a quiz tomorrow?" is one of the most obvious things to ask a
 * study assistant, but it's not tied to any one screen — a student could
 * ask it from the home screen, a PDF, anywhere. Per-screen context alone
 * can never answer that, so this runs on every message (in parallel with
 * everything else, not a new sequential round trip) and gives the model a
 * short, always-available look at what's actually coming up, independent
 * of whatever screen-specific context also applies.
 */
async function fetchUpcomingSummary(supabase: SupabaseClient): Promise<string | null> {
  const now = new Date().toISOString();

  try {
    const [tasksResult, examsResult] = await Promise.all([
      supabase
        .from('assignments')
        .select('title,due_at,priority,subject:subjects(name)')
        .neq('status', 'COMPLETED')
        .gte('due_at', now)
        .order('due_at', { ascending: true })
        .limit(MAX_UPCOMING_ITEMS),
      supabase
        .from('exams')
        .select('title,type,exam_at,subject:subjects(name)')
        .eq('status', 'UPCOMING')
        .gte('exam_at', now)
        .order('exam_at', { ascending: true })
        .limit(MAX_UPCOMING_ITEMS),
    ]);

    const tasks = (tasksResult.data ?? []) as UpcomingTaskRow[];
    const exams = (examsResult.data ?? []) as UpcomingAssessmentRow[];

    if (!tasks.length && !exams.length) {
      return 'The student has no upcoming tasks or assessments recorded.';
    }

    const lines: string[] = [];

    for (const task of tasks) {
      const subject = task.subject?.name ? ` (${task.subject.name})` : '';
      lines.push(
        `- Task: "${task.title}" due ${task.due_at}${subject} [${task.priority} priority]`,
      );
    }

    for (const exam of exams) {
      const subject = exam.subject?.name ? ` (${exam.subject.name})` : '';
      lines.push(`- Assessment: "${exam.title}" (${exam.type}) on ${exam.exam_at}${subject}`);
    }

    return `Upcoming tasks and assessments, regardless of the current screen:\n${lines.join('\n')}`;
  } catch (error) {
    console.error('Could not load upcoming summary:', error);
    return null;
  }
}

/**
 * Computes "now" in the student's own local timezone rather than the
 * server's (UTC) — day-of-week and free-period reasoning is wrong for
 * roughly half the day otherwise. `timezone` comes from the client's own
 * `Intl.DateTimeFormat().resolvedOptions().timeZone`; an invalid/missing
 * value just falls back to UTC rather than failing the request.
 */
function resolveLocalNow(timezone: string | undefined): {
  date: string;
  weekday: string;
  time: string;
} {
  const tz = timezone && /^[A-Za-z_]+(?:\/[A-Za-z_-]+){1,2}$/.test(timezone) ? timezone : 'UTC';
  const now = new Date();

  try {
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now);

    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    return { date, weekday, time };
  } catch {
    return {
      date: now.toISOString().slice(0, 10),
      weekday: WEEKDAY_NAMES[now.getUTCDay()],
      time: now.toISOString().slice(11, 16),
    };
  }
}

const MAX_SCHEDULE_ROWS = 100;

type WeeklyScheduleRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
  subject: SubjectRef;
};

/**
 * "When is my next free period?" and "what's my busiest day?" are
 * explicitly called out as example Schedule prompts, but they need the
 * whole week's shape, not just "next few" like tasks/exams — so this
 * fetches everything (a weekly recurring schedule is naturally small,
 * unlike the ever-growing tasks/exams tables) and is available regardless
 * of the current screen, same as `fetchUpcomingSummary`.
 */
async function fetchWeeklyScheduleSummary(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('class_schedules')
      .select('day_of_week,start_time,end_time,room,subject:subjects(name)')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(MAX_SCHEDULE_ROWS);

    const rows = (data ?? []) as WeeklyScheduleRow[];

    if (!rows.length) {
      return 'The student has no weekly class schedule recorded.';
    }

    const byDay = new Map<number, WeeklyScheduleRow[]>();

    for (const row of rows) {
      const list = byDay.get(row.day_of_week) ?? [];
      list.push(row);
      byDay.set(row.day_of_week, list);
    }

    const lines = [...byDay.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dayIndex, entries]) => {
        const dayName = WEEKDAY_NAMES[dayIndex] ?? `Day ${dayIndex}`;
        const entryText = entries
          .map((entry) => {
            const subject = entry.subject?.name ?? 'Class';
            const room = entry.room ? ` (${entry.room})` : '';
            return `${entry.start_time}-${entry.end_time} ${subject}${room}`;
          })
          .join(', ');

        return `${dayName}: ${entryText}`;
      });

    return `Weekly class schedule, regardless of the current screen:\n${lines.join('\n')}`;
  } catch (error) {
    console.error('Could not load weekly schedule summary:', error);
    return null;
  }
}

/**
 * Fetches the actual record the student is looking at, scoped to the
 * authenticated user by RLS (the `supabase` client here forwards the
 * caller's JWT, so a `contextId` for someone else's row just comes back
 * null rather than leaking data). `pdf` context uses `materialId` (not
 * `contextId`) since the client's PDF reader tracks it separately from a
 * generic context id. When a page number is given, the actual page text is
 * pulled from `study_material_pages` — cached client-side the first time
 * that page was viewed (see PdfReader.tsx) — so the assistant is never
 * re-extracting a PDF itself and never sees a page nobody has opened yet.
 * If the student's message names an explicit page range ("summarize pages
 * 20-30"), that range is fetched instead of just the current page — pages
 * outside it that were never viewed simply aren't in the result, same as
 * the single-page case. `home`/`general` have nothing to fetch.
 */
async function fetchContextData(
  supabase: SupabaseClient,
  contextType: string,
  contextId: string | null,
  materialId: string | null,
  page: number | null,
  pageRange: { start: number; end: number } | null,
): Promise<string | null> {
  const targetId = contextType === 'pdf' ? materialId : contextId;
  if (!targetId) return null;

  try {
    switch (contextType) {
      case 'task': {
        const { data } = await supabase
          .from('assignments')
          .select('title,description,due_at,priority,status,subject:subjects(name)')
          .eq('id', targetId)
          .maybeSingle();

        return formatTaskContext(data as TaskContextRow | null);
      }
      case 'assessment': {
        const { data } = await supabase
          .from('exams')
          .select('title,type,exam_at,room,coverage,notes,status,subject:subjects(name)')
          .eq('id', targetId)
          .maybeSingle();

        return formatAssessmentContext(data as AssessmentContextRow | null);
      }
      case 'schedule': {
        const { data } = await supabase
          .from('class_schedules')
          .select('day_of_week,start_time,end_time,room,subject:subjects(name)')
          .eq('id', targetId)
          .maybeSingle();

        return formatScheduleContext(data as ScheduleContextRow | null);
      }
      case 'subject': {
        const { data } = await supabase
          .from('subjects')
          .select('name,code,description,teacher,room,semester,academic_year')
          .eq('id', targetId)
          .maybeSingle();

        return formatSubjectContext(data as SubjectContextRow | null);
      }
      case 'note': {
        const { data } = await supabase
          .from('notes')
          .select('title,content,subject:subjects(name)')
          .eq('id', targetId)
          .maybeSingle();

        return formatNoteContext(data as NoteContextRow | null);
      }
      case 'study_material':
      case 'pdf': {
        const isPdf = contextType === 'pdf';

        const materialPromise = supabase
          .from('study_materials')
          .select('title,description,type,favorite,completed,subject:subjects(name)')
          .eq('id', targetId)
          .maybeSingle();

        if (isPdf && pageRange) {
          const [materialResult, rangeResult] = await Promise.all([
            materialPromise,
            supabase
              .from('study_material_pages')
              .select('page_number,content')
              .eq('material_id', targetId)
              .gte('page_number', pageRange.start)
              .lte('page_number', pageRange.end)
              .order('page_number', { ascending: true }),
          ]);

          const materialText = formatMaterialContext(
            materialResult.data as MaterialContextRow | null,
          );
          const rows = (rangeResult.data ?? []) as { page_number: number; content: string }[];

          if (!rows.length) return materialText;

          let rangeText = '';
          for (const row of rows) {
            const next = `Page ${row.page_number}:\n${row.content}\n\n`;
            if (rangeText.length + next.length > MAX_PAGE_RANGE_CHARS) break;
            rangeText += next;
          }

          return `${materialText ?? ''}\n\nText from pages ${pageRange.start}-${pageRange.end} (only pages actually viewed are included):\n${rangeText.trim()}`.trim();
        }

        const wantsPage = isPdf && Boolean(page);

        const [materialResult, pageResult] = await Promise.all([
          materialPromise,
          wantsPage
            ? supabase
                .from('study_material_pages')
                .select('content')
                .eq('material_id', targetId)
                .eq('page_number', page)
                .maybeSingle()
            : Promise.resolve({ data: null as { content: string } | null }),
        ]);

        const materialText = formatMaterialContext(
          materialResult.data as MaterialContextRow | null,
        );
        const pageText = truncateField(pageResult.data?.content, MAX_PDF_PAGE_CHARS);

        if (!pageText) return materialText;

        return `${materialText ?? ''}\n\nPage ${page} text:\n${pageText}`.trim();
      }
      default:
        return null;
    }
  } catch (error) {
    console.error('Could not load screen context:', error);
    return null;
  }
}

function buildContextHint(
  contextType: string,
  route: string,
  contextData: string | null,
  page: number | null,
  upcomingSummary: string | null,
  weeklySchedule: string | null,
  localNow: { date: string; weekday: string; time: string },
): string {
  const base =
    contextType === 'general'
      ? `The student is currently on: ${route || 'an unspecified screen'}.`
      : `The student is currently viewing a "${contextType}" screen (route: ${route || 'unknown'}).`;

  const pageNote = contextType === 'pdf' && page ? ` They are currently on page ${page}.` : '';
  // Needed so the model can correctly resolve "tomorrow"/"Friday"/"next free
  // period"/etc — both for answering questions and for the create_task
  // tool's dueAt argument. Computed in the student's own local timezone
  // (see resolveLocalNow), not the server's, since day/time are otherwise
  // wrong for roughly half the day.
  const todayNote = ` Today is ${localNow.weekday}, ${localNow.date}. The student's current local time is ${localNow.time}.`;

  let hint = base + pageNote + todayNote;

  if (contextData) {
    hint += `\n\nHere is the actual data for what they're viewing — treat it as ground truth, do not contradict it:\n${contextData}`;
  }

  if (upcomingSummary) {
    hint += `\n\n${upcomingSummary}`;
  }

  if (weeklySchedule) {
    hint += `\n\n${weeklySchedule}`;
  }

  return hint;
}

const MARK_TASK_COMPLETE_TOOL = 'mark_current_task_complete';
const PROPOSE_NEW_TASK_TOOL = 'propose_new_task';

type ActionProposal =
  | { type: 'MARK_TASK_COMPLETE'; taskId: string; label: string }
  | {
      type: 'CREATE_TASK';
      title: string;
      dueAt: string | null;
      notes: string;
      label: string;
    };

/**
 * Tool availability is deliberately narrow and context-gated:
 * - `mark_current_task_complete` takes NO arguments and is only declared
 *   when the server already knows exactly which task is being viewed
 *   (contextType 'task' + a real contextId). The task id always comes from
 *   our own trusted context, never from the model, so there's no way for
 *   Gemini to reference the wrong task.
 * - `propose_new_task` is only declared for task-adjacent screens
 *   (home/general/task) — not on every message — since tool declarations
 *   add prompt overhead and we already fought hard to cut latency.
 * Either way, calling a tool only PROPOSES an action; nothing is ever
 * written until the student taps Confirm in the app, which then uses the
 * app's own already-authenticated, RLS-protected code path to mutate data
 * (see AssistantActionCard.tsx) — Gemini never writes to the database.
 */
function buildTools(contextType: string, contextId: string | null): unknown[] | undefined {
  const functionDeclarations: Record<string, unknown>[] = [];

  if (['task', 'general', 'home'].includes(contextType)) {
    functionDeclarations.push({
      name: PROPOSE_NEW_TASK_TOOL,
      description:
        "Propose creating a new task/assignment. This does not save anything — the student reviews and confirms in the app's own form first.",
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'A short task title.' },
          dueAt: {
            type: 'string',
            description: 'Due date/time as an ISO 8601 datetime string, if specified or implied.',
          },
          notes: { type: 'string', description: 'Any extra detail the student gave.' },
        },
        required: ['title'],
      },
    });
  }

  if (contextType === 'task' && contextId) {
    functionDeclarations.push({
      name: MARK_TASK_COMPLETE_TOOL,
      description:
        'Propose marking the task the student is CURRENTLY VIEWING as completed. Only call this when they explicitly ask to mark/finish/complete it — never speculatively.',
      parameters: { type: 'object', properties: {} },
    });
  }

  return functionDeclarations.length ? [{ functionDeclarations }] : undefined;
}

/**
 * Converts a raw Gemini function call into a validated, typed proposal.
 * Returns null for anything malformed or out of scope — an invalid/unknown
 * tool call just quietly produces no action card rather than erroring.
 */
async function resolveActionProposal(
  supabase: SupabaseClient,
  functionCall: { name?: string; args?: Record<string, unknown> },
  contextType: string,
  contextId: string | null,
): Promise<ActionProposal | null> {
  if (functionCall.name === MARK_TASK_COMPLETE_TOOL) {
    if (contextType !== 'task' || !contextId) return null;

    const { data } = await supabase
      .from('assignments')
      .select('title')
      .eq('id', contextId)
      .maybeSingle();

    if (!data) return null;

    return {
      type: 'MARK_TASK_COMPLETE',
      taskId: contextId,
      label: `Mark "${data.title}" as completed?`,
    };
  }

  if (functionCall.name === PROPOSE_NEW_TASK_TOOL) {
    const args = functionCall.args ?? {};
    const title = typeof args.title === 'string' ? args.title.trim().slice(0, 150) : '';
    if (!title) return null;

    const dueAtRaw = typeof args.dueAt === 'string' ? args.dueAt : null;
    const dueAtMs = dueAtRaw ? Date.parse(dueAtRaw) : NaN;
    const dueAt = Number.isNaN(dueAtMs) ? null : new Date(dueAtMs).toISOString();
    const notes = typeof args.notes === 'string' ? args.notes.trim().slice(0, 500) : '';

    const dueLabel = dueAt ? ` due ${new Date(dueAt).toLocaleDateString()}` : '';

    return {
      type: 'CREATE_TASK',
      title,
      dueAt,
      notes,
      label: `Add a task: "${title}"${dueLabel}?`,
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    return await handleRequest(req);
  } catch (error) {
    console.error('Assistant request failed:', error);

    return friendlyError('Something went wrong. Please try again.', 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  const t0 = performance.now();
  const timings: Record<string, number> = {};
  const mark = (label: string) => {
    timings[label] = Math.round(performance.now() - t0);
  };

  if (req.method !== 'POST') {
    return friendlyError('Method not allowed.', 405);
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return friendlyError('Authentication required.', 401);
  }

  const userId = userIdFromVerifiedJwt(authHeader);

  if (!userId) {
    return friendlyError('Your session has expired. Please sign in again.', 401);
  }

  const supabase = createClient(supabaseUrl(), anonKey(), {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  mark('authResolved');

  let body: RequestBody;

  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return friendlyError('Invalid request.', 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return friendlyError('Enter a message before sending.', 400);
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return friendlyError(`Keep messages under ${MAX_MESSAGE_LENGTH} characters.`, 400);
  }

  const route = typeof body.route === 'string' ? body.route.slice(0, MAX_ROUTE_LENGTH) : '';

  const context = body.context ?? {};
  const contextType =
    typeof context.type === 'string' && CONTEXT_TYPES.has(context.type) ? context.type : 'general';
  const contextId = isUuid(context.id) ? context.id : null;
  const materialId = isUuid(context.materialId) ? context.materialId : null;
  const page =
    typeof context.page === 'number' && Number.isInteger(context.page) && context.page > 0
      ? context.page
      : null;

  const userMessageRow = {
    role: 'user' as const,
    content: message,
    route,
    context_type: contextType,
    context_id: contextId,
    material_id: materialId,
    page_number: page,
  };

  const localNow = resolveLocalNow(body.timezone);

  // Fired now, not awaited yet — all three run concurrently with the
  // conversation resolution below instead of adding their own sequential
  // round trips.
  const pageRange = contextType === 'pdf' ? parsePageRange(message) : null;
  const contextDataPromise = fetchContextData(
    supabase,
    contextType,
    contextId,
    materialId,
    page,
    pageRange,
  );
  const upcomingSummaryPromise = fetchUpcomingSummary(supabase);
  const weeklyScheduleSummaryPromise = fetchWeeklyScheduleSummary(supabase);

  const createConversation = () =>
    supabase
      .from('assistant_conversations')
      .insert({ user_id: userId, title: message.slice(0, 60) })
      .select('id')
      .single();

  let conversationId = isUuid(body.conversationId) ? body.conversationId : null;
  let historyRows: MessageRow[] = [];

  if (!conversationId) {
    // Brand new conversation: nothing to fetch history for, so skip that
    // round trip entirely and go straight to saving the first message.
    const { data: created, error: createError } = await createConversation();

    if (createError || !created) {
      console.error('Could not create conversation:', createError);

      return friendlyError('I could not start a new conversation. Please try again.', 500);
    }

    conversationId = created.id;

    const { error: insertError } = await supabase
      .from('assistant_messages')
      .insert({ conversation_id: conversationId, ...userMessageRow });

    if (insertError) {
      console.error('Could not save message:', insertError);
    }
  } else {
    /*
     * These two only depend on conversationId, not on each other, so they
     * run concurrently instead of as two sequential round trips. We no
     * longer verify the conversation exists first (that used to cost a
     * full extra round trip on every message) — RLS already rejects the
     * insert below if the id is stale or not owned by this user, and we
     * recover from that below instead of paying the check up front.
     */
    const [historyResult, insertResult] = await Promise.all([
      supabase
        .from('assistant_messages')
        .select('role,content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT),
      supabase
        .from('assistant_messages')
        .insert({ conversation_id: conversationId, ...userMessageRow }),
    ]);

    if (historyResult.error) {
      console.error('Could not load conversation history:', historyResult.error);
    }

    historyRows = (historyResult.data ?? []) as MessageRow[];

    if (insertResult.error) {
      console.error('Stale conversation id, starting a fresh conversation:', insertResult.error);

      const { data: created, error: createError } = await createConversation();

      if (createError || !created) {
        console.error('Could not recover with a new conversation:', createError);

        return friendlyError('I could not start a new conversation. Please try again.', 500);
      }

      conversationId = created.id;
      historyRows = [];

      const { error: retryError } = await supabase
        .from('assistant_messages')
        .insert({ conversation_id: conversationId, ...userMessageRow });

      if (retryError) {
        console.error('Could not save message after recovery:', retryError);
      }
    }
  }

  mark('conversationReady');

  const [contextData, upcomingSummary, weeklyScheduleSummary] = await Promise.all([
    contextDataPromise,
    upcomingSummaryPromise,
    weeklyScheduleSummaryPromise,
  ]);
  mark('contextReady');

  const history = historyRows.slice().reverse();

  const contextHint = buildContextHint(
    contextType,
    route,
    contextData,
    page,
    upcomingSummary,
    weeklyScheduleSummary,
    localNow,
  );

  const contents: GeminiContent[] = [
    ...history.map((row) => ({
      role: row.role === 'assistant' ? 'model' : 'user',
      parts: [
        {
          text:
            row.content.length > MAX_HISTORY_MESSAGE_CHARS
              ? `${row.content.slice(0, MAX_HISTORY_MESSAGE_CHARS)}…`
              : row.content,
        },
      ],
    })),
    {
      role: 'user',
      parts: [{ text: `${contextHint}\n\n${message}` }],
    },
  ];

  const apiKey = required('GEMINI_API_KEY');
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash';
  const tools = buildTools(contextType, contextId);

  if (body.stream) {
    return streamGeminiReply({
      apiKey,
      contents,
      contextId,
      contextType,
      conversationId,
      model,
      route,
      supabase,
      tools,
      mark,
      timings,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  let replyText = '';
  let finishReason: string | undefined;
  let action: ActionProposal | null = null;

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: GENERATION_CONFIG,
          ...(tools ? { tools } : {}),
        }),
        signal: controller.signal,
      },
    );

    mark('geminiResponded');

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text();

      console.error('Gemini error:', geminiResponse.status, detail.slice(0, 500));

      if (geminiResponse.status === 429) {
        return friendlyError('The assistant is busy right now. Please try again shortly.', 429);
      }

      return friendlyError(
        'I could not reach the assistant right now. Please try again in a moment.',
        502,
      );
    }

    const payload = await geminiResponse.json();
    const candidate = payload?.candidates?.[0];
    const parts: Array<{
      text?: string;
      functionCall?: { name?: string; args?: Record<string, unknown> };
    }> = candidate?.content?.parts ?? [];
    finishReason = candidate?.finishReason;

    replyText = parts
      .map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    const functionCall = parts.find((part) => part.functionCall)?.functionCall;

    if (functionCall) {
      action = await resolveActionProposal(supabase, functionCall, contextType, contextId);
      if (!replyText && action) replyText = action.label;
    }

    if (!replyText) {
      console.error('Unexpected Gemini response shape:', JSON.stringify(payload).slice(0, 500));

      return friendlyError('I did not get a usable response. Please try again.', 502);
    }

    if (finishReason === 'MAX_TOKENS') {
      console.error('Gemini reply hit the token cap and was truncated.');
      replyText += CUTOFF_NOTICE;
    } else if (finishReason && finishReason !== 'STOP') {
      console.error('Gemini finished with an unexpected reason:', finishReason);
    }
  } catch (fetchError) {
    console.error('Gemini request failed:', fetchError);

    return friendlyError(
      'I could not reach the assistant right now. Please try again in a moment.',
      502,
    );
  } finally {
    clearTimeout(timeout);
  }

  // The student already has their answer at this point — saving the reply doesn't need to block the response.
  const persistReply = async () => {
    const { error: insertAssistantError } = await supabase.from('assistant_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: replyText,
      route,
      context_type: 'general',
    });

    if (insertAssistantError) {
      console.error('Could not save assistant reply:', insertAssistantError);
    }
  };

  runInBackground(persistReply());

  mark('total');
  console.log('[assistant:timing]', JSON.stringify({ ...timings, finishReason }));

  return Response.json({ conversationId, message: replyText, action }, { headers: CORS_HEADERS });
}

function runInBackground(task: Promise<unknown>) {
  const edgeRuntime = (
    globalThis as { EdgeRuntime?: { waitUntil: (task: Promise<unknown>) => void } }
  ).EdgeRuntime;

  if (edgeRuntime) {
    edgeRuntime.waitUntil(task);
  } else {
    void task;
  }
}

type StreamParams = {
  supabase: SupabaseClient;
  apiKey: string;
  model: string;
  contents: GeminiContent[];
  contextId: string | null;
  contextType: string;
  conversationId: string;
  route: string;
  tools: unknown[] | undefined;
  mark: (label: string) => void;
  timings: Record<string, number>;
};

/**
 * Web-only path (opt in via `stream: true`) that re-emits Gemini's own SSE
 * stream as a simplified `data: {...}` protocol the client can parse
 * incrementally, so the student sees text appear as it's generated instead
 * of waiting for the full reply. Native callers never set `stream`, since
 * React Native's fetch does not reliably support reading a streaming body.
 */
async function streamGeminiReply(params: StreamParams): Promise<Response> {
  const {
    apiKey,
    contents,
    contextId,
    contextType,
    conversationId,
    mark,
    model,
    route,
    supabase,
    timings,
    tools,
  } = params;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  let geminiResponse: Response;

  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: GENERATION_CONFIG,
          ...(tools ? { tools } : {}),
        }),
        signal: controller.signal,
      },
    );
  } catch (fetchError) {
    clearTimeout(timeout);
    console.error('Gemini stream request failed:', fetchError);

    return friendlyError(
      'I could not reach the assistant right now. Please try again in a moment.',
      502,
    );
  }

  mark('geminiHeadersReceived');

  if (!geminiResponse.ok || !geminiResponse.body) {
    clearTimeout(timeout);

    const detail = await geminiResponse.text().catch(() => '');
    console.error('Gemini stream error:', geminiResponse.status, detail.slice(0, 500));

    if (geminiResponse.status === 429) {
      return friendlyError('The assistant is busy right now. Please try again shortly.', 429);
    }

    return friendlyError(
      'I could not reach the assistant right now. Please try again in a moment.',
      502,
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const geminiBody = geminiResponse.body;
  let fullText = '';
  let firstDeltaMarked = false;
  let finishReason: string | null = null;
  let pendingFunctionCall: { name?: string; args?: Record<string, unknown> } | null = null;

  const stream = new ReadableStream({
    async start(controllerOut) {
      const send = (payload: Record<string, unknown>) =>
        controllerOut.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      send({ type: 'conversation', conversationId });

      const reader = geminiBody.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const candidate = parsed?.candidates?.[0];
              const parts: Array<{
                text?: string;
                functionCall?: { name?: string; args?: Record<string, unknown> };
              }> = candidate?.content?.parts ?? [];

              if (typeof candidate?.finishReason === 'string') {
                finishReason = candidate.finishReason;
              }

              for (const part of parts) {
                if (typeof part.text === 'string' && part.text) {
                  if (!firstDeltaMarked) {
                    firstDeltaMarked = true;
                    mark('firstDeltaSent');
                  }

                  fullText += part.text;
                  send({ type: 'delta', text: part.text });
                }

                if (part.functionCall && !pendingFunctionCall) {
                  pendingFunctionCall = part.functionCall;
                }
              }
            } catch {
              // Partial/malformed SSE line — Gemini's own framing can split
              // a JSON payload across reads; skip and let the buffer catch up.
            }
          }
        }

        if (pendingFunctionCall) {
          const action = await resolveActionProposal(
            supabase,
            pendingFunctionCall,
            contextType,
            contextId,
          );

          if (action) {
            if (!fullText.trim()) {
              fullText = action.label;
              send({ type: 'delta', text: action.label });
            }

            send({ type: 'action', action });
          }
        }

        if (finishReason === 'MAX_TOKENS') {
          console.error('Gemini reply hit the token cap and was truncated.');
          fullText += CUTOFF_NOTICE;
          send({ type: 'delta', text: CUTOFF_NOTICE });
        } else if (finishReason && finishReason !== 'STOP') {
          console.error('Gemini finished with an unexpected reason:', finishReason);
        }

        send({ type: 'done' });
      } catch (streamError) {
        console.error('Gemini stream failed mid-response:', streamError);
        send({ type: 'error', message: 'I could not finish that response. Please try again.' });
      } finally {
        clearTimeout(timeout);
        controllerOut.close();
        mark('total');
        console.log('[assistant:timing]', JSON.stringify({ ...timings, finishReason }));

        if (fullText.trim()) {
          runInBackground(
            supabase
              .from('assistant_messages')
              .insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: fullText.trim(),
                route,
                context_type: 'general',
              })
              .then(({ error }) => {
                if (error) console.error('Could not save assistant reply:', error);
              }),
          );
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
