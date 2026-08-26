# AI Study Assistant — Global Context-Aware Assistant

## Goal

Add AI throughout the entire Study Companion app instead of treating it as a separate chatbot feature.

The assistant should always be easy to access from the main app screens. The student should be able to tap the AI button whenever she needs help without leaving what she is currently doing.

The assistant must understand the current screen and, when appropriate, the specific item currently being viewed.

The **Study Session feature should remain removed** and must not be recreated.

---

# Official AI Persona

The AI assistant's official visual identity is the teddy bear image stored as:

```text
bear.png
```

Use `bear.png` as the **face, avatar, profile image, and recognizable persona** of the AI Study Assistant throughout the app.

Do not replace it with:

- a generic robot icon
- a sparkle icon as the main identity
- an emoji
- a random teddy bear
- another generated mascot
- the Gemini logo

Gemini is only the underlying AI provider. The student should interact visually with the bear persona.

The intended association should be:

```text
Bear = AI Study Assistant
```

---

# Bear Persona Guidelines

The bear should make the assistant feel:

- warm
- gentle
- approachable
- patient
- comforting
- supportive
- personal

The assistant should still sound capable and useful.

Avoid making the personality:

- childish
- overly emotional
- roleplay-heavy
- excessively cute
- full of unnecessary emojis
- overly verbose

Good response style:

```text
You have two tasks due tomorrow. I would start with Programming 2 because you also have a quiz coming up.
```

Avoid:

```text
Aww! 🧸✨ Let's tackle your super-duper homework together! 💕
```

The bear provides the warmth visually. The text should remain clear and natural.

---

# Bear Asset Handling

Use:

```text
bear.png
```

as the original source asset.

Recommended structure:

```text
assets/
  bear.png
  bear-avatar.png
  bear-button.png
```

The additional variants should only be optimized or cropped derivatives of `bear.png`.

Use:

```text
bear.png
```

for larger profile/welcome views.

Use:

```text
bear-avatar.png
```

for:

- assistant header
- chat avatar
- profile areas

Use:

```text
bear-button.png
```

for:

- floating global AI button

Do not duplicate unnecessarily large image files.

Optimize the derived assets for mobile performance.

---

# Bear Image Cleanup

Inspect `bear.png`.

If the checkerboard background is actually baked into the image instead of being true transparency:

- remove the checkerboard
- preserve the teddy bear
- create a transparent-background derivative
- use the cleaned version in production UI

Do not show an obvious checkerboard background in the app.

For small avatar crops, prioritize:

- face
- ears
- eyes
- nose

The full bow does not need to be visible inside a tiny floating button.

Do not crop through the bear's face or ears awkwardly.

---

# Core Product Concept

The AI should behave like a built-in assistant that follows the student throughout the app.

Instead of:

```text
Open app
→ Go to Assistant tab
→ Explain context manually
→ Ask question
```

Prefer:

```text
Open any screen
→ Tap bear AI button
→ Ask question
→ AI already understands the current context
```

Examples:

```text
Home
"What's important today?"

Schedule
"When is my next free period?"

Tasks
"Which assignment should I do first?"

Assessment
"How long until this exam?"

PDF Reader
"Explain this page."

Notes
"Turn this into reviewer questions."
```

The assistant should reduce navigation and manual explanation.

---

# Global AI Button

Add a persistent AI button to the main app experience.

The button must use the bear persona from `bear.png`, preferably through an optimized `bear-button.png` derivative.

Suggested placement:

```text
bottom-right floating button
```

Preferred appearance:

```text
small circular or softly rounded floating button
→ cropped bear face/avatar inside
```

Requirements:

- clearly show the bear's face
- comfortable mobile touch target
- subtle border or shadow if needed
- visually soft and consistent with the app
- not oversized
- not distracting
- respect safe areas
- never block important screen controls

Show it on appropriate main screens such as:

```text
Home
Schedule
Tasks
Assessments
Subjects
Study Materials
PDF Reader
Notes
```

Do not show it where it would interfere with:

- authentication
- destructive confirmation dialogs
- onboarding screens where unnecessary
- temporary full-screen flows where it causes layout problems

---

# AI Button States

## Normal

Show the bear avatar.

## Assistant Open

Keep the bear identity visible in the opened panel.

The floating button may become a subtle close/minimize control if that fits the existing app architecture.

## Loading

If useful, add a subtle pulse around the bear avatar.

Do not replace the bear with a generic robot icon.

## Optional Indicator

A small unread/attention indicator may be added later if needed.

Do not add aggressive animation.

Respect reduced-motion preferences.

---

# AI Interaction UI

When the student taps the bear button, open a:

```text
bottom sheet
```

or:

```text
floating assistant panel
```

Prefer a bottom sheet on mobile.

The user should not have to leave the current screen.

Example:

```text
┌───────────────────────────────┐
│ [Bear] Study Assistant        │
│ Viewing: Tasks                │
│                               │
│ [ Suggested question ]        │
│ [ Suggested question ]        │
│                               │
│ Ask something...        Send  │
└───────────────────────────────┘
```

The sheet can expand into a larger chat view if the conversation becomes longer.

---

# Assistant Header

Always use the bear avatar in the assistant header.

Example:

```text
[Bear] Study Assistant
       Here to help with what you're viewing
```

When context exists:

```text
[Bear] Study Assistant
       Viewing: Programming 2 Reviewer · Page 18
```

or:

```text
[Bear] Study Assistant
       Viewing: Quantitative Methods Assignment
```

The header should communicate:

1. who the assistant is
2. what context it currently understands

---

# AI Chat Avatar

AI messages should use the bear avatar.

Do not use:

- generic bot icon
- Gemini logo
- sparkle icon as the assistant avatar

User messages do not need the bear avatar.

---

# Welcome / Empty State

When the student opens the assistant without an active conversation, show the bear prominently but compactly.

Example:

```text
        [Bear]

Hi! What can I help you with?

[What's important today?]
[Explain what I'm viewing]
[What is due this week?]
```

Do not create a huge decorative hero section.

Keep the focus on quickly starting a useful interaction.

---

# Optional Full Assistant Page

Keep an optional full Assistant page for:

- conversation history
- longer conversations
- reopening previous chats
- starting a new chat
- browsing previous AI interactions

Use the bear avatar/profile there as well.

The primary interaction should still be the global bear button.

---

# Context-Aware Assistant

Every AI request should include information about where the student currently is in the app.

Example request:

```ts
{
  message: "Explain this to me",
  route: "/tasks/123",
  context: {
    type: "assignment",
    id: "123"
  }
}
```

PDF example:

```ts
{
  message: "Explain this page",
  route: "/study/materials/abc",
  context: {
    type: "pdf",
    materialId: "abc",
    page: 12
  }
}
```

The client should send only safe identifiers and UI context.

The server must determine what data is actually retrieved.

Never trust arbitrary database content sent from the client.

---

# Context Types

Support context types such as:

```text
home
schedule
task
assessment
subject
study_material
pdf
note
general
```

Use the actual existing app structure and entities whenever possible.

---

# Screen Context Adapters

Create a small context adapter for each major area.

Suggested structure:

```text
lib/
  ai/
    context/
      home.ts
      schedule.ts
      tasks.ts
      assessments.ts
      subjects.ts
      materials.ts
      pdf.ts
      notes.ts
```

Each adapter should define what data is safe and useful for AI.

Do not send the entire database on every request.

---

# Home Context

When opened from Home, AI may receive:

- today's classes
- tasks due today
- overdue tasks
- upcoming assessments
- important reminders

Example questions:

```text
What's important today?
What do I need to finish?
Do I have anything urgent?
What should I prioritize?
```

---

# Schedule Context

When opened from Schedule, AI may receive:

- class schedule
- current date
- requested date
- free periods
- upcoming classes

Example questions:

```text
What classes do I have tomorrow?
When is my next class?
When is my next free period?
What does my Wednesday look like?
```

---

# Tasks Context

When opened from Tasks, AI may receive:

- visible assignments
- deadlines
- subject
- completion status
- priority
- overdue state

If a specific task is open, use that task as primary context.

Example questions:

```text
Which assignment should I do first?
What is due soon?
Explain this assignment.
How much time do I have left?
```

---

# Assessment Context

When opened from a quiz or exam, AI may receive:

- assessment title
- subject
- type
- date/time
- related study materials
- related notes

Example questions:

```text
How many days until this exam?
What materials do I have for this?
What should I review?
Quiz me using my materials for this subject.
```

The assistant may recommend preparation but must not recreate Study Sessions.

---

# Subject Context

When opened from a subject, AI may receive:

- subject name
- class schedule
- assignments
- assessments
- study materials
- notes

Example questions:

```text
What do I have for Programming 2?
What am I behind on?
What exam is coming up?
Show me what I should review.
```

---

# Study Material Context

When opened from Study Materials, AI can help with:

```text
Summarize this material.
What is this reviewer about?
Make practice questions.
Explain the difficult parts.
```

If no specific material is selected, AI can help identify an appropriate material based on the request.

---

# PDF Reader Context

The PDF Reader should have the deepest AI integration.

When AI opens from the PDF Reader, include:

```text
material ID
current page
current visible page range
selected text, if any
nearby extracted text
subject
reading progress
```

Do not automatically send the entire PDF.

Example questions:

```text
Explain this page.
Summarize pages 10-15.
What does this paragraph mean?
Quiz me from what I just read.
Give me the key points.
Turn this section into reviewer notes.
```

---

# Text Selection AI

If technically practical, allow the student to select text and invoke AI.

Example actions:

```text
Explain
Summarize
Simplify
Make question
Create flashcard
```

Example flow:

```text
Student highlights paragraph
→ taps Explain
→ bear assistant opens
→ selected text is automatically included
```

This is optional for the first implementation.

---

# Notes Context

When opened from Notes, provide the current note text or selected note as context.

Example questions:

```text
Clean up these notes.
Make these easier to understand.
Turn these into flashcards.
Create a quiz from this.
Summarize my notes.
```

Do not overwrite notes automatically.

Show AI-generated changes as suggestions first.

---

# Contextual Suggested Prompts

Do not show the same prompts everywhere.

## Home

```text
What's important today?
What is due next?
Do I have anything urgent?
```

## Schedule

```text
What do I have tomorrow?
When is my next free period?
What's my busiest day?
```

## Tasks

```text
Which should I do first?
What is overdue?
What's due this week?
```

## PDF

```text
Explain this page.
Summarize this section.
Quiz me from this.
```

## Notes

```text
Summarize these notes.
Make flashcards.
Create practice questions.
```

---

# Recommended Stack

Use the existing app stack where possible.

## AI Provider

Use the Google Gemini API initially.

Keep the provider behind a service layer so it can be replaced later.

Suggested structure:

```text
lib/
  ai/
    client.ts
    assistant.ts
    prompts.ts
    context.ts
    actions.ts
```

Never call Gemini directly from the frontend with a secret key.

---

# Environment Variable

Add:

```env
GEMINI_API_KEY=
```

The key must:

- remain server-side
- never be committed
- never appear in client bundles
- never be stored in client-readable Supabase tables

Update `.env.example` without including the real key.

---

# Global Assistant Components

Suggested reusable structure:

```text
components/
  assistant/
    AssistantProvider.tsx
    AssistantButton.tsx
    AssistantSheet.tsx
    AssistantComposer.tsx
    AssistantMessages.tsx
    SuggestedPrompts.tsx
    BearAvatar.tsx
```

Possible usage:

```tsx
<AssistantProvider>
  <App />
  <AssistantButton />
  <AssistantSheet />
</AssistantProvider>
```

`BearAvatar.tsx` should consistently use the optimized derivative of `bear.png`.

---

# Registering Screen Context

Screens should register their context with the AssistantProvider.

Example:

```ts
setAssistantContext({
  type: "assignment",
  id: assignment.id
})
```

PDF example:

```ts
setAssistantContext({
  type: "pdf",
  materialId,
  page: currentPage
})
```

Clear or replace context when navigation changes.

Never let stale context leak into another screen.

---

# Server Request

Use a protected server-side endpoint.

Example:

```text
POST /api/assistant
```

Input:

```json
{
  "conversationId": "...",
  "message": "What should I do first?",
  "route": "/tasks",
  "context": {
    "type": "tasks"
  }
}
```

Server flow:

```text
Authenticate user
    ↓
Validate request
    ↓
Validate context
    ↓
Retrieve relevant app data
    ↓
Retrieve PDF/note context if needed
    ↓
Build AI prompt
    ↓
Call Gemini
    ↓
Save conversation
    ↓
Return response
```

Never accept a client-provided user ID as proof of ownership.

Use the authenticated session.

---

# Data-Aware Assistant

The assistant should use real app data for app-related questions.

Possible sources:

```text
subjects
class_schedules
assignments
assessments
study_materials
notes
PDF reading progress
```

Use actual existing table names in the project.

Do not create duplicate tables if equivalent tables already exist.

---

# Example — Tasks

Student is on Tasks.

She taps the bear and asks:

```text
Which one should I do first?
```

Server retrieves:

```text
Task A — due tonight
Task B — due tomorrow
Task C — due Friday
```

AI response:

```text
Start with Task A because it is due tonight.

After that, I would work on Task B since it is due tomorrow.
```

She does not need to explain which tasks she is viewing.

---

# Example — PDF

Student is viewing page 18 of:

```text
Programming 2 Reviewer.pdf
```

She taps the bear and asks:

```text
I don't understand this.
```

The assistant receives:

```text
current PDF
current page
relevant extracted text
```

and explains that content.

This contextual behavior is the main advantage of having AI available everywhere.

---

# PDF Processing

Reuse the existing PDF system.

If PDF text extraction is not already stored, implement:

```text
PDF upload
    ↓
Extract text
    ↓
Split into page-aware chunks
    ↓
Store searchable chunks
    ↓
Retrieve only relevant chunks for AI
```

Useful metadata:

```text
material_id
page_number
chunk_index
text
```

Keep the first implementation simple unless semantic retrieval is necessary.

---

# PDF Retrieval Rules

If the student asks:

```text
Explain this page
```

retrieve the current page.

If she asks:

```text
Summarize pages 20-30
```

retrieve that page range.

If she asks:

```text
Where does this reviewer discuss recursion?
```

search the extracted material text.

Do not send an entire 200-page PDF unnecessarily.

---

# Quiz Generation

AI can generate quizzes from:

- current PDF page
- selected PDF section
- full selected study material
- notes
- subject materials

Supported formats:

```text
multiple choice
true/false
identification
short answer
```

Default to around 5 questions unless the student asks for a different amount.

---

# Flashcards

Allow commands such as:

```text
Make flashcards from this page.
Make flashcards from these notes.
```

Initial version can return flashcards inside AI chat.

A future version may save them into a dedicated flashcard system.

Do not build a full flashcard feature unless requested.

---

# Prioritization

The assistant may answer:

```text
What should I prioritize today?
```

Default priority order:

1. overdue work
2. tasks due today
3. quizzes/exams happening very soon
4. assignments due soon
5. lower-priority future work

The assistant should explain why it recommends something.

---

# AI Actions

Initially, keep the assistant mostly read-only.

It can:

```text
read
explain
summarize
compare
recommend
quiz
organize
suggest
```

It should not silently:

```text
create tasks
delete tasks
change deadlines
mark work complete
edit notes
change schedules
```

---

# Future AI Actions

Later, AI may support commands such as:

```text
Add an assignment for Friday.
Mark this as completed.
Move this task to tomorrow.
Save these generated notes.
```

Any write action must require explicit confirmation.

Example:

```text
AI:
I can mark "Programming Assignment 3" as completed.

[Cancel] [Confirm]
```

Only after Confirm should application code perform the mutation.

Gemini must never directly write to the database.

---

# AI Action Architecture

Future action flow:

```text
User request
    ↓
AI identifies possible action
    ↓
Server converts to typed action proposal
    ↓
App displays confirmation
    ↓
User confirms
    ↓
Server validates ownership and payload
    ↓
App performs database mutation
```

Example:

```ts
type AssistantAction =
  | {
      type: "MARK_TASK_COMPLETE";
      taskId: string;
    }
  | {
      type: "CREATE_TASK";
      title: string;
      dueAt?: string;
      subjectId?: string;
    };
```

Never execute arbitrary model-generated code or SQL.

---

# System Prompt

Use a stable system instruction similar to:

```text
You are the Study Assistant built into a student's personal Study Companion app.

Your visual persona is a warm teddy bear, but your written responses should remain clear, natural, useful, and concise.

You may receive context about the screen the student is currently viewing and data from their account.

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

You may recommend actions, but do not claim that you changed app data unless the application explicitly confirms that the action was completed.
```

---

# Conversation Persistence

Create chat persistence if it does not already exist.

Suggested schema:

```text
assistant_conversations
- id
- user_id
- title
- created_at
- updated_at

assistant_messages
- id
- conversation_id
- role
- content
- route
- context_type
- context_id
- created_at
```

Optional:

```text
material_id
page_number
```

Use Row Level Security.

A user may only access their own conversations.

---

# Context and Conversation Behavior

For MVP:

- keep one active conversation
- preserve messages
- update current screen context on every request
- allow New Chat manually

Do not overcomplicate automatic thread switching initially.

---

# Context Chips

Inside the assistant sheet, optionally show:

```text
[ Programming 2 Reviewer ]
[ Page 18 ]
```

Allow removing optional context where appropriate.

Do not allow removal of ownership/security constraints.

---

# Loading and Error States

Handle:

- AI request in progress
- no internet
- Gemini rate limit
- Gemini unavailable
- database failure
- missing context item
- PDF extraction unavailable
- authentication expired
- deleted task/material
- invalid response

Friendly error example:

```text
I couldn't reach the assistant right now. Please try again in a moment.
```

Never display raw provider or database errors.

---

# Streaming

Streaming is recommended because AI may be used frequently.

The response can appear gradually in the assistant sheet.

However:

```text
correctness > streaming
```

If streaming introduces instability, ship non-streaming responses first.

---

# Cost Protection

Even when using free-tier AI usage, prevent unnecessary requests.

Implement:

- message length limit
- request throttling
- prevent duplicate sends
- relevant-context retrieval only
- PDF page/chunk limits
- trimmed conversation history
- server timeout
- avoid repeatedly sending unchanged large context
- cache safe derived PDF text where useful

Do not call Gemini merely because a screen opened.

Only call AI after an explicit user request.

---

# Security

Requirements:

- Gemini API key server-side only
- authenticate every AI request
- enforce Supabase RLS
- never expose service-role keys
- validate every context ID
- verify context belongs to the authenticated user
- limit request payload sizes
- never allow arbitrary SQL from AI output
- never automatically execute AI-generated mutations
- sanitize displayed model output where required
- do not include unrelated private data in prompts

The server is responsible for context retrieval.

The frontend must not send entire database objects to Gemini.

---

# Accessibility

The bear AI button should have an accessible label such as:

```text
Open Study Assistant
```

Bear profile/avatar images should use labels such as:

```text
Study Assistant avatar
```

The global button should:

- support keyboard focus on web
- have sufficient touch target size
- avoid blocking content
- work with screen readers
- respect reduced-motion settings

The bottom sheet should:

- have a close button
- support keyboard dismissal
- handle focus correctly
- remain usable above the mobile keyboard

---

# Mobile UX

The feature is primarily mobile-oriented.

Desired behavior:

```text
tap bear
→ bottom sheet opens
→ current screen remains visible behind it
→ keyboard opens only when user taps input
```

The bear button should not cover:

- save buttons
- floating task buttons
- PDF controls
- bottom navigation

Adjust position per screen if necessary.

---

# Design Integration

The bear should feel integrated into the existing app.

Do not redesign the entire application around the mascot.

Reuse existing:

- typography
- spacing
- colors
- cards
- borders
- navigation patterns

The bear is an identity layer on top of the existing product design.

Avoid mixing multiple AI identities such as:

```text
bear avatar + robot + sparkle + Gemini branding
```

The bear should be the primary visible assistant identity.

---

# Optional Micro-Animations

If easy to implement cleanly:

- subtle scale-in when assistant opens
- soft pulse while AI responds
- slight fade when context changes

Do not:

- make the bear bounce continuously
- animate eyes or mouth excessively
- create distracting character animations

This remains a productivity app.

---

# Do Not Do

Do not:

- make AI the only way to use the app
- remove normal navigation
- force chat for basic information
- recreate Study Sessions
- automatically modify app records
- send all user data on every request
- expose API keys
- make AI requests without user interaction
- make the bear button visually distracting
- substitute another AI mascot for `bear.png`

The app should remain fully usable without AI.

AI is an assistance layer on top of the existing features.

---

# Phase 1 — Global AI Foundation

Implement:

- Gemini server integration
- AssistantProvider
- bear-based global AI button
- assistant bottom sheet
- bear assistant header/avatar
- chat composer
- response UI
- current route awareness
- basic conversation persistence
- loading/error states

Acceptance criteria:

- [ ] `bear.png` is used as the source AI persona asset
- [ ] AI button uses the bear
- [ ] AI messages/profile use the bear
- [ ] AI button is available on main app screens
- [ ] Tapping it opens the assistant without navigating away
- [ ] User can send messages
- [ ] Gemini responds
- [ ] Current route is included in assistant requests
- [ ] Messages persist
- [ ] API key remains server-side
- [ ] Mobile layout works
- [ ] Build passes
- [ ] Study Session remains removed

---

# Phase 2 — Screen-Aware Context

Add adapters for:

- Home
- Schedule
- Tasks
- Assessments
- Subjects

Acceptance criteria:

- [ ] Home AI can answer today's important items
- [ ] Schedule AI can answer schedule questions
- [ ] Tasks AI understands visible/current tasks
- [ ] Assessment AI understands selected exam/quiz
- [ ] Subject AI understands related tasks and assessments
- [ ] Context updates after navigation
- [ ] AI never uses stale context
- [ ] AI does not invent missing records

---

# Phase 3 — Study Materials and PDF AI

Add:

- study material context
- PDF current-page awareness
- page-range retrieval
- summaries
- explanations
- quiz generation
- note-aware context

Acceptance criteria:

- [ ] AI knows which PDF is open
- [ ] AI knows current page
- [ ] "Explain this page" works
- [ ] "Summarize pages X-Y" works
- [ ] "Quiz me from this" works
- [ ] Notes can be used as AI context
- [ ] Large PDFs use targeted retrieval
- [ ] Other users' materials cannot be accessed

---

# Phase 4 — Enhanced Context UX

Add if useful:

- context chips
- selected-text AI
- suggested prompts by screen
- assistant expanded/fullscreen mode
- full conversation history page
- subtle bear loading animation

Acceptance criteria:

- [ ] Suggested prompts match current screen
- [ ] Current context is visible
- [ ] Bear remains the AI identity in all assistant views
- [ ] Assistant can expand for longer chats
- [ ] Previous conversations can be reopened

---

# Phase 5 — Confirmed AI Actions

Only implement after the read-only assistant is stable.

Possible actions:

- create assignment
- update priority
- mark task complete
- save generated notes
- create reminder

Requirements:

- typed actions
- ownership validation
- confirmation UI
- server-controlled mutation
- audit-friendly behavior

Acceptance criteria:

- [ ] AI cannot mutate data without confirmation
- [ ] Confirmation clearly states what will change
- [ ] Cancel performs no action
- [ ] Confirmed actions validate ownership
- [ ] Gemini never directly accesses the database

---

# Final Product Principle

The AI should feel like part of the entire Study Companion app.

The teddy bear from:

```text
bear.png
```

is the assistant's official face and identity everywhere AI appears.

The intended experience is:

```text
Student is anywhere in the app
→ sees the bear button
→ taps the bear
→ assistant opens
→ bear remains visible as the AI persona
→ assistant automatically understands the current screen
→ student asks a natural question
```

Examples:

```text
She's viewing an assignment
→ taps bear
→ "Can you explain what I need to do here?"
```

```text
She's reading a reviewer
→ taps bear
→ "Explain this page in simple terms."
```

```text
She's on Home
→ taps bear
→ "What should I worry about today?"
```

The student should not need to repeatedly explain which screen, task, subject, note, or PDF she is viewing.

The app supplies context automatically.

The bear is not a decoration.

The bear is the **face of the AI Study Assistant throughout the entire Study Companion app**.
