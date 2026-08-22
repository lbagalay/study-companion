const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const vapidPublicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

export const env = {
  supabaseUrl,
  supabasePublishableKey,
  vapidPublicKey,
} as const;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
