/**
 * Login rate limiting.
 *
 * Fixed-window counter keyed by client IP. Per-process and in-memory by
 * design: on serverless platforms each instance counts separately, so this
 * is an abuse-mitigation speed bump, not a globally reliable control. For a
 * hardened production deployment, front the app with a WAF/rate limiter or
 * swap the store for Redis — see README (documented limitation).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const GLOBAL_KEY = '__multiSiteRateLimits';
const store: Map<string, Bucket> = (() => {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Map<string, Bucket> };
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = buckets;
  return g[GLOBAL_KEY];
})();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  /** Attempts allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Distinct bucket namespace (e.g. "login"). */
  scope: string;
}

export function checkRateLimit(
  identifier: string,
  { limit, windowMs, scope }: RateLimitOptions,
): RateLimitResult {
  const key = `${scope}:${identifier}`;
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clear the counter after a successful login. */
export function resetRateLimit(identifier: string, scope: string): void {
  store.delete(`${scope}:${identifier}`);
}

/** Test/ops helper. */
export function clearAllRateLimits(): void {
  store.clear();
}

export const LOGIN_RATE_LIMIT: RateLimitOptions = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
  scope: 'login',
};
