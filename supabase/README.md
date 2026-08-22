# Supabase setup

1. Create a Supabase project.
2. Apply `migrations/202608220001_initial_schema.sql` using the Supabase CLI or SQL editor.
3. Run `tests/security_assertions.sql` after the migration.
4. Copy `.env.example` to `.env` and set the project URL and publishable key.
5. Keep the service-role key out of the Expo application.

The migration creates the profile trigger, all MVP tables and indexes, owner-only row-level security policies, and a private `study-materials` bucket whose first path segment must match the authenticated user ID.
