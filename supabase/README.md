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
4. `tests/security_assertions.sql`

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

## 5. Verify

Run `tests/security_assertions.sql`, then inspect Edge Function logs and the `cron.job_run_details` table after creating an activity or exam whose reminder time is due.

On iPhone, Web Push can only be enabled from the installed Home Screen PWA. Open the deployed site in Safari, use Share > Add to Home Screen, launch the installed app, sign in, and choose Profile > Enable this device.

## Study-load document extraction

The Subjects > Import study load flow sends the selected photo or PDF to an authenticated Edge Function. The function uses the OpenAI Responses API to extract schema-constrained subject and weekly schedule data. The file is not saved by Study Companion, and the user must review the result before importing it.

Set the server-only OpenAI secret and deploy the function:

```sh
npx supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY OPENAI_STUDY_LOAD_MODEL=gpt-5.6-luna
npx supabase functions deploy extract-study-load
```

Do not add `OPENAI_API_KEY` to the Expo or Vercel environment. OpenAI API use is billed to the API project associated with that key, so configure project spend limits before enabling this feature for other users.
