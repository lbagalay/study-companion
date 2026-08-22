# Study Companion

A mobile-first Expo application for helping a student understand what is happening today and what to study next.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and add the Supabase project URL and publishable key when a project is available.
3. Start the development server with `npm start`.

Use `npm run ios`, `npm run android`, or `npm run web` to target a specific platform.

## Deploy to Vercel

The included `vercel.json` builds the Expo Router web export into `dist`.
Configure these public client variables in the Vercel project before deploying:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_VAPID_PUBLIC_KEY`

After deployment, add the Vercel domain to the Supabase Auth site URL and redirect URL allow list.

The web export includes an installable PWA manifest, iPhone Home Screen metadata, and a push service worker. The reminder dispatcher must also be configured in Supabase; follow `supabase/README.md` before enabling reminders in production.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build:web`

## Backend setup

Apply the migration and security assertions described in `supabase/README.md`. Until valid public Supabase settings are present, the app intentionally shows a configuration message on the login screen instead of creating a client with fake credentials.

## Implemented MVP

The application includes authentication and password recovery, profiles, subjects, free on-device study-load screenshot importing with editable review, weekly schedules, assignments, exams, private study-material uploads, a secure PWA PDF reader with saved page progress, Continue Studying, and editable page-linked notes, general notes, deterministic study-plan generation, study sessions, native local reminders, reliable PWA Web Push reminders, dashboard urgency ordering, offline query caching, loading/error/empty states, light/dark appearance, and five-tab mobile navigation.
