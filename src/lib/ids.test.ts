import { describe, expect, it } from 'vitest';

import { createClientUuid } from '@/lib/ids';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createClientUuid', () => {
  it('creates a UUID v4 without requiring crypto.randomUUID', () => {
    const provider = {
      getRandomValues(bytes: Uint8Array<ArrayBuffer>) {
        bytes.forEach((_, index) => { bytes[index] = index; });
        return bytes;
      },
    };

    expect(createClientUuid(provider)).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
  });

  it('falls back when Web Crypto is unavailable', () => {
    expect(createClientUuid({})).toMatch(UUID_V4);
  });
});
