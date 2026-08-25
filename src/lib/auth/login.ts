import { z } from 'zod';

import { getErrorMessage } from '@/lib/errors';

export const loginSchema = z.object({
  email: z.email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginValues = z.infer<typeof loginSchema>;

export function signInErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials'))
    return 'The email or password is incorrect.';
  if (normalized.includes('email not confirmed'))
    return 'Confirm your email from the message Supabase sent, then try again.';
  if (normalized.includes('failed to fetch') || normalized.includes('network'))
    return 'Could not reach Supabase. Check your connection and try again.';
  return message;
}
