# Supabase setup

Study Companion uses Supabase Auth, Postgres, Storage, and an Edge Function. The browser only receives the publishable project key and public VAPID key. Never expose a secret or service-role key in an `EXPO_PUBLIC_` variable.

## 1. Connect the project

Create a Supabase project, then link the CLI from this repository:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

`db push` applies all migrations in order. They create the MVP schema, owner-only row-level security, the private `study-materials` bucket, browser push subscriptions, the reminder delivery queue, and the transactional study-load importer.

If you use the dashboard SQL editor instead, run these files in order:

1. `migrations/202608220001_initial_schema.sql`
2. `migrations/202608220002_web_push_notifications.sql`
3. `migrations/202608220003_study_load_import.sql`
4. `migrations/202608220004_pdf_reader_phase_one.sql`
5. `migrations/202608220005_pdf_reader_function_privileges.sql`
6. `migrations/202608230006_pdf_page_notes_phase_two.sql`
7. `migrations/202608230007_pdf_ink_annotations.sql`
8. `migrations/202608260008_assistant_conversations.sql`
9. `migrations/202608260009_study_material_pages.sql`
10. `migrations/202608260010_function_privileges_hardening.sql`
11. `migrations/202608260011_assignment_cancelled_status.sql`
12. `tests/security_assertions.sql`

## 2. Configure the app

Copy the root `.env.example` to `.env` and set:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
EXPO_PUBLIC_VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY
```

Add the local and deployed app URLs under Authentication > URL Configuration in the Supabase dashboard. Include the exact `/reset-password` redirect URL used by each environment.

## 3. Create Web Push keys

Generate one VAPID key pair and keep using the same pair after deployment:

```sh
npx web-push generate-vapid-keys
```

The public key goes in the app environment above. The private key only goes in Supabase Edge Function secrets.

## 4. Deploy the reminder dispatcher

Generate a long random cron secret, then set the function secrets and deploy:

```sh
npx supabase secrets set VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY VAPID_PRIVATE_KEY=YOUR_PRIVATE_VAPID_KEY VAPID_SUBJECT=mailto:YOUR_EMAIL REMINDER_CRON_SECRET=YOUR_LONG_RANDOM_CRON_SECRET
npx supabase functions deploy send-reminders
```

`config.toml` disables Supabase's user-JWT check for this function because the database cron calls it. The function still rejects every request that does not contain the matching cron secret.

Finally, replace the placeholders in `setup_web_push_cron.sql` and run it once in the SQL editor. It stores the function URL and cron secret in Vault and invokes the dispatcher every minute.

## 5. Deploy the AI Study Assistant

The assistant runs entirely server-side. The Gemini API key never reaches the app bundle — the client only calls the authenticated `assistant` Edge Function, which is the sole place the key is used.

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey), then set it as a function secret and deploy:

```sh
npx supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY
npx supabase functions deploy assistant
```

Unlike `send-reminders`, this function keeps Supabase's default JWT verification enabled (no `[functions.assistant]` entry in `config.toml`), so every request must carry a valid signed-in user's session — the same session the rest of the app already uses. `assistant_conversations`/`assistant_messages` (added by `migrations/202608260008_assistant_conversations.sql`) are owner-only via RLS, same as every other table.

`study_material_pages` (added by `migrations/202608260009_study_material_pages.sql`) caches PDF text extracted client-side per page, the first time each page is viewed, so the assistant can ground answers about a PDF in the actual page text without re-extracting it on every question. It's insert-only cache storage — no update policy — deduped by a unique `(material_id, page_number)` constraint.

## 6. Verify

Run `tests/security_assertions.sql`, then inspect Edge Function logs and the `cron.job_run_details` table after creating an activity or exam whose reminder time is due.

On iPhone, Web Push can only be enabled from the installed Home Screen PWA. Open the deployed site in Safari, use Share > Add to Home Screen, launch the installed app, sign in, and choose Profile > Enable this device.

## Study-load screenshot import

The Schedule > Upload study load and Subjects > Import study load flows read screenshots and photos directly in the browser with Tesseract.js. No paid API key is required, and the selected image is not uploaded to Study Companion or Supabase. The parser is tailored to the tabular Subject #, Subject Title, Offer #, Schedule, and Units format, and the user reviews normal editable UI fields before the transactional database import.

For the clearest result, use the original screenshot at full resolution with the complete table visible. PDF users can save the study-load page as a screenshot before importing it.
