import { describe, expect, it } from 'vitest';

import { loginSchema, signInErrorMessage } from '@/lib/auth/login';

describe('login validation and feedback', () => {
  it('allows existing six-character passwords to reach Supabase', () => {
    expect(loginSchema.safeParse({ email: 'student@example.com', password: '123456' }).success).toBe(true);
  });

  it('still rejects empty credentials', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '' });
    expect(result.success).toBe(false);
  });

  it('turns common Supabase failures into clear guidance', () => {
    expect(signInErrorMessage(new Error('Invalid login credentials'))).toBe('The email or password is incorrect.');
    expect(signInErrorMessage(new Error('Email not confirmed'))).toContain('Confirm your email');
    expect(signInErrorMessage(new Error('Failed to fetch'))).toContain('Could not reach Supabase');
  });
});
