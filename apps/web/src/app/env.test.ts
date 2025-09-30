import { describe, it, expect, vi } from 'vitest';

// Mock upstream key providers to avoid strict required vars during unit test runtime.
vi.mock('@opencut/auth/keys', () => ({
  keys: () => ({
    BETTER_AUTH_SECRET: 'test-secret',
    UPSTASH_REDIS_REST_URL: 'https://example.com',
    UPSTASH_REDIS_REST_TOKEN: 'token',
    NEXT_PUBLIC_BETTER_AUTH_URL: 'https://example.com',
  }),
}));
vi.mock('@opencut/db/keys', () => ({
  keys: () => ({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  }),
}));

import { env } from '../../src/env';

// Basic env shape test (won't assert secrets, only presence of loader)

describe('env configuration', () => {
  it('should expose required keys helper', () => {
    expect(env).toBeDefined();
    // A representative key (non-secret) optional depending on runtime
    expect('NODE_ENV' in env).toBe(true);
  });
});
