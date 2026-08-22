# Study Companion

A mobile-first Expo application for helping a student understand what is happening today and what to study next.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and add the Supabase project URL and publishable key when a project is available.
3. Start the development server with `npm start`.

Use `npm run ios`, `npm run android`, or `npm run web` to target a specific platform.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build:web`

## Backend setup

Apply the migration and security assertions described in `supabase/README.md`. Until valid public Supabase settings are present, the app intentionally shows a configuration message on the login screen instead of creating a client with fake credentials.

## Implemented MVP

The application includes authentication and password recovery, profiles, subjects, weekly schedules, assignments, exams, private study-material uploads, notes, deterministic study-plan generation, study sessions, local reminders, dashboard urgency ordering, offline query caching, loading/error/empty states, light/dark appearance, and five-tab mobile navigation.
