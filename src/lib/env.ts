const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const env = {
  supabaseUrl,
  supabasePublishableKey,
} as const;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
