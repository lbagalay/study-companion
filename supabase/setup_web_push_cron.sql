-- Run this once in Supabase SQL Editor after deploying send-reminders.
-- Replace every placeholder before running. Do not commit real secret values.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'study_companion_project_url');
select vault.create_secret('YOUR_LONG_RANDOM_CRON_SECRET', 'study_companion_reminder_cron_secret');

select cron.schedule(
  'study-companion-send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'study_companion_project_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'study_companion_reminder_cron_secret')
    ),
    body := jsonb_build_object('invoked_at', timezone('utc', now())),
    timeout_milliseconds := 10000
  );
  $$
);
