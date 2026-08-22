# Study Companion App — Codex Implementation Plan

## 1. Project Overview

Build a polished mobile study companion app for a student.

The app should help the student manage:

- Weekly class schedule
- Assignments and deadlines
- Quizzes and exams
- Subjects
- Study materials
- Notes
- Study sessions
- Upcoming deadlines
- Progress and completed tasks

The primary user experience should answer:

> "What do I need to do today, and what should I study next?"

This is a **mobile-first React Native application**.

---

# 2. Recommended Tech Stack

## Frontend

- React Native
- Expo
- TypeScript
- Expo Router
- NativeWind or standard React Native StyleSheet
- React Hook Form
- Zod

## Backend

- Supabase

Use Supabase for:

- PostgreSQL database
- Authentication
- File storage
- Row Level Security
- Realtime updates where useful

## Mobile Tooling

- Expo Go during development
- EAS Build for production builds
- Expo Notifications for reminders
- Expo SecureStore for secure local session storage if needed

---

# 3. Product Goals

The app should:

1. Be fast and easy to use.
2. Prioritize upcoming responsibilities.
3. Make deadlines visually obvious.
4. Keep subject-related information organized.
5. Reduce the amount of manual navigation required.
6. Feel like a real mobile application, not a website inside a phone.
7. Remain simple enough for one student to use daily.

Do not over-engineer the first version.

---

# 4. MVP Scope

The MVP must include:

- Authentication
- Dashboard
- Subjects
- Weekly class schedule
- Assignments
- Quizzes and exams
- Study materials
- Notes
- Basic study planner
- Notifications/reminders
- User settings

Do not implement AI features during MVP.

---

# 5. Application Navigation

Use a bottom tab navigation structure.

Suggested tabs:

1. Home
2. Schedule
3. Tasks
4. Study
5. Profile

Suggested icons:

- Home
- Calendar
- CheckSquare
- BookOpen
- User

Use a nested stack where needed.

Example:

```text
app/
├── _layout.tsx
├── index.tsx
├── login.tsx
├── register.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── home.tsx
│   ├── schedule.tsx
│   ├── tasks.tsx
│   ├── study.tsx
│   └── profile.tsx
├── subjects/
│   ├── index.tsx
│   ├── create.tsx
│   └── [id].tsx
├── assignments/
│   ├── create.tsx
│   └── [id].tsx
├── exams/
│   ├── create.tsx
│   └── [id].tsx
├── materials/
│   ├── create.tsx
│   └── [id].tsx
└── settings/
    └── index.tsx
```

---

# 6. Main Screens

## 6.1 Authentication

Screens:

- Login
- Register
- Forgot password

Use Supabase Auth.

MVP authentication:

- Email
- Password

Optional later:

- Google login
- Apple login

---

# 7. Home Dashboard

The dashboard is the most important screen.

It should immediately show:

## Header

- Greeting
- Student name
- Current date
- Profile photo/avatar

Example:

```text
Good afternoon, Mia

Saturday, August 22
```

---

## Today Section

Show today's classes.

Each class card should contain:

- Subject
- Start time
- End time
- Room
- Teacher if available
- Subject color

Highlight the current class if the current time is between its start and end time.

---

## Upcoming Section

Show the most urgent items first.

Priority order:

1. Overdue assignments
2. Assignments due today
3. Exams within 3 days
4. Assignments within 3 days
5. Other upcoming exams
6. Other assignments

Example:

```text
Database Assignment
Due tomorrow

Math Quiz
3 days left

Programming Exam
7 days left
```

---

## Continue Studying

Show the latest active study session or next recommended study topic.

Example:

```text
Continue Studying

Database Systems
Normalization

30 min planned
```

---

## Progress Summary

Show:

- Tasks completed this week
- Tasks remaining
- Study sessions completed
- Upcoming exams

Keep this visually simple.

---

# 8. Subjects

Each subject should include:

- Name
- Subject code
- Description
- Teacher
- Room
- Color
- Optional icon
- Semester
- Academic year

Example:

```text
Database Systems
IT 203
Instructor: Prof. Santos
Room: 302
```

---

# 9. Subject Detail Screen

Each subject page should act as a hub.

Show:

## Header

- Subject name
- Subject code
- Teacher
- Room

## Next Class

Show next scheduled class.

## Assignments

Show active assignments.

## Exams

Show upcoming quizzes/exams.

## Study Materials

Show files, links, and notes.

## Study Progress

Show:

- Materials completed
- Tasks completed
- Study sessions completed

---

# 10. Weekly Schedule

Create a weekly schedule screen.

Modes:

- Week view
- Day view

Each schedule item contains:

- Subject
- Day
- Start time
- End time
- Room
- Subject color

Allow the user to:

- Add class
- Edit class
- Delete class

Sort classes chronologically.

---

# 11. Assignments

Assignment fields:

- Title
- Subject
- Description
- Due date
- Due time
- Priority
- Status
- Attachment
- Notes
- Created date

Statuses:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

Priorities:

```text
LOW
MEDIUM
HIGH
URGENT
```

---

# 12. Assignment Views

Tasks page should include filters:

- All
- Today
- This Week
- Upcoming
- Completed
- Overdue

Assignment cards should display:

- Title
- Subject
- Due date
- Priority
- Status

Use visual urgency indicators.

Example:

```text
Database ERD

Database Systems
Due tomorrow
HIGH PRIORITY
```

---

# 13. Quizzes and Exams

Exam types:

```text
QUIZ
EXAM
MIDTERM
FINAL
PRACTICAL
PRESENTATION
OTHER
```

Fields:

- Title
- Subject
- Type
- Date
- Time
- Room
- Coverage
- Notes
- Reminder
- Status

Display countdowns.

Example:

```text
Math Midterm

August 29
7 days left

Coverage
- Functions
- Limits
- Derivatives
```

---

# 14. Study Materials

Materials should always belong to a subject.

Supported material types:

```text
PDF
IMAGE
DOCUMENT
LINK
VIDEO_LINK
NOTE
OTHER
```

Fields:

- Title
- Subject
- Type
- Description
- File URL
- External URL
- Created date
- Favorite
- Completed

Use Supabase Storage for uploaded files.

Recommended storage structure:

```text
study-materials/
    user_id/
        subject_id/
            filename.pdf
```

---

# 15. Notes

Allow lightweight study notes.

Fields:

- Title
- Subject
- Content
- Created date
- Updated date
- Favorite

Support Markdown-style text later if desired.

For MVP, plain rich text is enough.

---

# 16. Study Planner

The study planner should help the student prepare for exams.

User flow:

1. Open exam.
2. Tap "Create Study Plan".
3. Select study topics.
4. Select available days.
5. Select preferred session duration.
6. Generate study sessions.

Example:

```text
Exam:
Math Midterm
August 29

Study Plan

Aug 23 — Functions
Aug 24 — Graphing
Aug 25 — Limits
Aug 26 — Derivatives
Aug 27 — Practice Problems
Aug 28 — Review
Aug 29 — Exam
```

---

# 17. Study Sessions

Study session fields:

- Subject
- Exam
- Topic
- Planned date
- Planned duration
- Actual duration
- Status
- Notes

Statuses:

```text
PLANNED
IN_PROGRESS
COMPLETED
SKIPPED
```

---

# 18. Notifications

Use Expo Notifications.

Allow reminders for:

## Assignments

Default notification options:

- 1 day before
- 3 hours before
- 1 hour before

## Exams

Default:

- 7 days before
- 3 days before
- 1 day before
- Morning of exam

## Study Sessions

Default:

- 15 minutes before

Allow notifications to be disabled globally.

---

# 19. Database Schema

Use Supabase PostgreSQL.

## profiles

```text
id uuid primary key
email text
full_name text
avatar_url text
created_at timestamptz
updated_at timestamptz
```

The `id` should match `auth.users.id`.

---

## subjects

```text
id uuid primary key
user_id uuid foreign key
name text
code text
description text
teacher text
room text
color text
semester text
academic_year text
created_at timestamptz
updated_at timestamptz
```

---

## class_schedules

```text
id uuid primary key
user_id uuid foreign key
subject_id uuid foreign key
day_of_week integer
start_time time
end_time time
room text
created_at timestamptz
updated_at timestamptz
```

Recommended day values:

```text
0 Sunday
1 Monday
2 Tuesday
3 Wednesday
4 Thursday
5 Friday
6 Saturday
```

---

## assignments

```text
id uuid primary key
user_id uuid foreign key
subject_id uuid foreign key
title text
description text
due_at timestamptz
priority text
status text
attachment_url text
notes text
created_at timestamptz
updated_at timestamptz
completed_at timestamptz
```

---

## exams

```text
id uuid primary key
user_id uuid foreign key
subject_id uuid foreign key
title text
type text
exam_at timestamptz
room text
coverage text
notes text
status text
created_at timestamptz
updated_at timestamptz
```

---

## study_materials

```text
id uuid primary key
user_id uuid foreign key
subject_id uuid foreign key
title text
description text
type text
file_url text
external_url text
favorite boolean
completed boolean
created_at timestamptz
updated_at timestamptz
```

---

## notes

```text
id uuid primary key
user_id uuid foreign key
subject_id uuid foreign key
title text
content text
favorite boolean
created_at timestamptz
updated_at timestamptz
```

---

## study_sessions

```text
id uuid primary key
user_id uuid foreign key
subject_id uuid foreign key
exam_id uuid nullable foreign key
topic text
planned_at timestamptz
planned_duration integer
actual_duration integer
status text
notes text
created_at timestamptz
updated_at timestamptz
```

---

# 20. Supabase Row Level Security

RLS MUST be enabled.

Every user should only access rows where:

```sql
auth.uid() = user_id
```

Do not rely only on frontend filtering.

Apply policies to:

- subjects
- class_schedules
- assignments
- exams
- study_materials
- notes
- study_sessions

Storage policies must also restrict files to the current authenticated user.

---

# 21. Application State

Prefer server/database state over complicated global state.

Use:

- React Query / TanStack Query for server data
- React Context only for small global UI states
- Local component state for forms and temporary UI

Do not create one massive global store.

---

# 22. Form Validation

Use:

- React Hook Form
- Zod

Every create/edit form must validate:

- Required fields
- Dates
- Times
- URLs
- Field length

Display friendly validation errors.

---

# 23. Date and Time Handling

Store timestamps in UTC.

Render in the user's timezone.

Default timezone:

```text
Asia/Manila
```

Use a proper date library.

Recommended:

- date-fns

Do not manually parse dates unnecessarily.

---

# 24. UI / UX Direction

The application should feel:

- Soft
- Modern
- Personal
- Calm
- Student-friendly
- Mobile-first

Avoid:

- Enterprise dashboard appearance
- Excessive cards
- Tiny text
- Huge data tables
- Desktop-first layouts
- Excessive gradients
- Over-animated interfaces

---

# 25. Design System

Use consistent:

- Spacing
- Radius
- Typography
- Colors
- Icons

Suggested radius:

```text
12px–20px
```

Suggested visual hierarchy:

```text
Page title
Section title
Primary information
Secondary metadata
Muted helper text
```

Use a maximum of one strong accent color per subject card.

---

# 26. Personalization

The app is being built for one specific student.

Support:

- Preferred name
- Avatar
- Theme color
- Dark mode
- Subject colors
- Motivational messages

Example motivational copy:

```text
Almost done for today.

You have one task left.

Your next exam is in 4 days.

Everything for today is completed.
```

Keep this subtle.

---

# 27. Empty States

Every page needs a useful empty state.

Example:

```text
No assignments yet.

Add your first assignment so upcoming deadlines appear here.
```

Never show blank screens.

---

# 28. Loading States

Use:

- Skeleton loaders
- Small loading indicators

Avoid blocking the entire screen where possible.

---

# 29. Error Handling

Handle:

- Network errors
- Supabase failures
- File upload failures
- Invalid sessions
- Notification permission denial

Show user-friendly messages.

Do not expose raw database errors.

---

# 30. Offline Behavior

MVP does not need full offline synchronization.

However:

- Cache recent data where practical.
- Preserve unsaved form input if possible.
- Show a clear offline indicator.

Full offline sync can be a later feature.

---

# 31. Suggested Folder Structure

```text
src/
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── subjects/
│   ├── assignments/
│   ├── exams/
│   ├── schedule/
│   └── study/
├── hooks/
├── lib/
│   ├── supabase/
│   ├── notifications/
│   ├── dates/
│   └── validation/
├── services/
│   ├── subjects.ts
│   ├── assignments.ts
│   ├── exams.ts
│   ├── materials.ts
│   └── studySessions.ts
├── types/
├── constants/
└── utils/
```

Do not place all database calls directly inside screen components.

---

# 32. Reusable Components

Build reusable components such as:

```text
AppHeader
ScreenContainer
SubjectCard
AssignmentCard
ExamCard
ScheduleCard
MaterialCard
StudySessionCard
EmptyState
LoadingSkeleton
SectionHeader
CountdownBadge
PriorityBadge
StatusBadge
DatePickerField
TimePickerField
ConfirmDialog
```

---

# 33. Phase 1 — Project Setup

Codex should:

1. Initialize Expo project.
2. Enable TypeScript.
3. Configure Expo Router.
4. Configure linting.
5. Configure formatting.
6. Configure environment variables.
7. Add Supabase client.
8. Add authentication.
9. Create navigation shell.
10. Create base design system.

Do not build every screen immediately.

First confirm the application runs successfully.

---

# 34. Phase 2 — Database

Create Supabase migrations for:

- profiles
- subjects
- class_schedules
- assignments
- exams
- study_materials
- notes
- study_sessions

Then:

- Add indexes.
- Enable RLS.
- Create security policies.
- Test permissions.

---

# 35. Phase 3 — Authentication

Implement:

- Register
- Login
- Logout
- Session persistence
- Protected routes
- Profile creation

After login, route the user to Home.

---

# 36. Phase 4 — Subjects

Implement:

- Subject list
- Create subject
- Edit subject
- Delete subject
- Subject details

This becomes the foundation for the remaining modules.

---

# 37. Phase 5 — Schedule

Implement:

- Weekly schedule
- Add class schedule
- Edit class schedule
- Delete class schedule
- Today's classes
- Current class detection

Dashboard should now display today's classes.

---

# 38. Phase 6 — Assignments

Implement:

- Assignment CRUD
- Priority
- Status
- Due dates
- Overdue detection
- Today filter
- Week filter
- Completion

Dashboard should show upcoming assignments.

---

# 39. Phase 7 — Exams

Implement:

- Exam CRUD
- Exam types
- Countdown
- Coverage
- Upcoming exams
- Exam filtering

Dashboard should display exam urgency.

---

# 40. Phase 8 — Materials

Implement:

- Upload file
- Add external link
- Material list
- Material details
- Subject filtering
- Favorites
- Completion status

Use Supabase Storage.

---

# 41. Phase 9 — Notes

Implement:

- Create note
- Edit note
- Delete note
- Subject notes
- Favorites

---

# 42. Phase 10 — Study Planner

Implement basic automatic study plan generation.

Example algorithm:

1. Calculate days until exam.
2. Get exam topics.
3. Reserve the day before exam for review.
4. Distribute topics across remaining study days.
5. Generate study sessions.
6. Allow manual editing.

Do not use AI for this.

---

# 43. Phase 11 — Notifications

Implement notification permission request.

Schedule reminders for:

- Assignments
- Exams
- Study sessions

Notifications should automatically update if the event date changes.

Delete obsolete notifications when an item is deleted.

---

# 44. Phase 12 — Polish

Implement:

- Loading states
- Empty states
- Error states
- Animations
- Haptic feedback
- Pull-to-refresh
- Dark mode
- Keyboard handling
- Safe-area handling

Test on a physical phone.

---

# 45. Future AI Features

DO NOT implement these until MVP is stable.

Possible Phase 2 product features:

## AI Summaries

Upload notes or PDFs and generate concise summaries.

## Flashcards

Generate question-answer flashcards.

## Practice Quizzes

Generate practice questions from study materials.

## AI Tutor

Allow the student to ask questions about uploaded study materials.

## Automatic Study Plans

Generate more intelligent revision schedules.

## Weak Topic Detection

Track quiz results and recommend topics that need more practice.

---

# 46. Future Features

Potential additions:

- Calendar synchronization
- Google Calendar
- Pomodoro timer
- Study streaks
- Widgets
- Shared schedules
- Teacher announcements
- Grade tracker
- GPA calculator
- Attendance tracker
- Cloud backup
- Home-screen widgets
- Apple Calendar integration

Do not add these during the initial build unless explicitly requested.

---

# 47. Testing Requirements

Test:

## Authentication

- Login
- Logout
- Wrong password
- Session persistence

## Subjects

- Create
- Edit
- Delete

## Schedule

- Multiple classes same day
- Correct ordering
- Current class detection

## Assignments

- Due today
- Overdue
- Completed
- Future assignment

## Exams

- Countdown
- Date changes
- Multiple exam types

## Materials

- Upload
- Download/view
- Delete
- Invalid file

## Notifications

- Permission denied
- Schedule
- Reschedule
- Cancel

---

# 48. Security Requirements

Never:

- Put Supabase service-role keys inside the mobile app.
- Disable RLS in production.
- Trust user_id values submitted by the client.
- Expose private storage buckets publicly unless necessary.

Use:

- Supabase anonymous key
- Authentication
- Row Level Security
- Secure storage policies

---

# 49. Performance Requirements

Avoid:

- Loading every assignment ever created.
- Loading full files into memory unnecessarily.
- Excessive re-renders.
- Massive dependency packages.

Paginate or limit historical data where appropriate.

Optimize images before upload.

---

# 50. Definition of Done — MVP

The MVP is complete when the student can:

1. Register/login.
2. Add subjects.
3. Add weekly classes.
4. View today's classes.
5. Add assignments.
6. Complete assignments.
7. Add quizzes/exams.
8. See countdowns.
9. Upload study materials.
10. Create notes.
11. Generate a simple study plan.
12. Receive reminders.
13. Use the app comfortably on a real phone.

---

# 51. Codex Development Rules

Codex must follow these rules:

1. Read this entire document before modifying the project.
2. Do not build every feature simultaneously.
3. Work phase by phase.
4. Keep the project runnable after every major change.
5. Use TypeScript strictly.
6. Avoid `any` unless absolutely necessary.
7. Create reusable components.
8. Keep screen components reasonably small.
9. Separate UI, business logic, and database operations.
10. Validate all forms.
11. Handle loading and error states.
12. Follow Supabase RLS security practices.
13. Do not expose secrets.
14. Do not implement AI features before MVP completion.
15. Prefer simple implementations over unnecessary abstractions.
16. Do not redesign working sections unless required.
17. Test functionality before moving to the next phase.
18. Keep mobile UX as the primary priority.

---

# 52. Initial Codex Task

Codex should begin with ONLY the following:

1. Inspect the repository.
2. If no Expo project exists, initialize one using Expo + TypeScript.
3. Install and configure Expo Router.
4. Create the base folder architecture.
5. Configure Supabase client placeholders.
6. Create a minimal design system.
7. Create the bottom-tab application shell:
   - Home
   - Schedule
   - Tasks
   - Study
   - Profile
8. Add placeholder screens.
9. Ensure the project builds and launches successfully.
10. Report:
    - Files created
    - Dependencies installed
    - Architecture decisions
    - Next recommended task

Do NOT implement the entire application during the first task.

---

# 53. Suggested Initial Command

If starting from scratch:

```bash
npx create-expo-app@latest study-companion
cd study-companion
npx expo start
```

Use the current stable Expo-supported package versions rather than forcing outdated versions.

---

# 54. Product Principle

Every feature should support at least one of these questions:

> What do I have today?

> What is due soon?

> What exam should I prepare for?

> What should I study next?

> Where are my study materials?

If a feature does not meaningfully support the student's study workflow, it probably does not belong in the MVP.
