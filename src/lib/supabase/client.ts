import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { env, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

let client: SupabaseClient<Database> | null = null;

/**
 * Creates the browser/native Supabase client only after public project settings
 * are present. Placeholder screens can therefore launch before a project exists.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured || !env.supabaseUrl || !env.supabasePublishableKey) {
    return null;
  }

  client ??= createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });

  return client;
}

export function requireSupabaseClient(): SupabaseClient<Database> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the public project URL and publishable key to .env.');
  }
  return supabase;
}
