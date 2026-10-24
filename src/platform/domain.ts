/**
 * Hostname parsing and normalization.
 *
 * Pure functions with no I/O so they are safe in the Edge middleware, unit
 * tests, and both data adapters. Normalization rules:
 *   - lowercase
 *   - strip a trailing dot (FQDN form)
 *   - strip the port from an incoming Host header value
 *   - reject empty/invalid hostname formats (returns null)
 *   - `www.` is NOT stripped: it is a distinct hostname unless a Domain row
 *     explicitly maps it to the site
 */

const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*$/;

const IPV6_PATTERN = /^[0-9a-f:]{2,45}$/;

/** "Business.Demo.Local:3000." -> "business.demo.local"; null when invalid. */
export function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  let value = host.trim().toLowerCase();
  if (!value) return null;
  // Strip any port (IPv6 hosts arrive bracketed via x-forwarded-host handling).
  if (value.startsWith('[')) {
    const close = value.indexOf(']');
    if (close === -1) return null;
    value = value.slice(1, close);
  } else {
    const colon = value.indexOf(':');
    if (colon !== -1) value = value.slice(0, colon);
  }
  value = value.replace(/\.+$/, '');
  if (!value) return null;
  // IPv6 literals (::1, 2001:db8::1) contain colons and skip the name rules.
  if (IPV6_PATTERN.test(value) && value.includes(':')) return value;
  if (!HOSTNAME_PATTERN.test(value)) return null;
  return value;
}

/** Extract the raw Host header value to normalize (x-forwarded-host first). */
export function hostFromHeaders(
  forwardedHost: string | null | undefined,
  host: string | null | undefined,
): string | null {
  const raw = forwardedHost?.split(',')[0]?.trim() || host?.split(',')[0]?.trim();
  return normalizeHost(raw);
}
