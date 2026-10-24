import { describe, expect, it, beforeEach } from 'vitest';
import { hashPassword, verifyPassword, verifyPasswordEqualized, MIN_PASSWORD_LENGTH } from '@/lib/admin/password';
import { checkRateLimit, resetRateLimit, clearAllRateLimits } from '@/lib/admin/rate-limit';

describe('admin passwords', () => {
  it('hashes and verifies passwords with bcrypt', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain('correct horse');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('timing-equalizes unknown accounts through the dummy hash', async () => {
    await expect(verifyPasswordEqualized('anything', null)).resolves.toBe(false);
    const hash = await hashPassword('known');
    await expect(verifyPasswordEqualized('known', hash)).resolves.toBe(true);
  });

  it('enforces a minimum password length policy constant', () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(12);
  });
});

describe('login rate limiting', () => {
  beforeEach(() => clearAllRateLimits());

  it('allows attempts within the limit', () => {
    const opts = { limit: 3, windowMs: 60_000, scope: 'test' };
    expect(checkRateLimit('ip-a', opts).allowed).toBe(true);
    expect(checkRateLimit('ip-a', opts).allowed).toBe(true);
    expect(checkRateLimit('ip-a', opts).allowed).toBe(true);
  });

  it('blocks beyond the limit and reports retry time', () => {
    const opts = { limit: 2, windowMs: 60_000, scope: 'test' };
    checkRateLimit('ip-b', opts);
    checkRateLimit('ip-b', opts);
    const blocked = checkRateLimit('ip-b', opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('counts identifiers independently', () => {
    const opts = { limit: 1, windowMs: 60_000, scope: 'test' };
    expect(checkRateLimit('ip-c', opts).allowed).toBe(true);
    expect(checkRateLimit('ip-c', opts).allowed).toBe(false);
    expect(checkRateLimit('ip-d', opts).allowed).toBe(true);
  });

  it('resets after a successful login clears the counter', () => {
    const opts = { limit: 1, windowMs: 60_000, scope: 'test' };
    checkRateLimit('ip-e', opts);
    checkRateLimit('ip-e', opts);
    resetRateLimit('ip-e', 'test');
    expect(checkRateLimit('ip-e', opts).allowed).toBe(true);
  });
});
