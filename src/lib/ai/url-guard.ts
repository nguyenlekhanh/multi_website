/**
 * URL guard against server-side request forgery.
 *
 * Remote AI providers are called server-side, so their base URLs must never
 * point at internal infrastructure. Rules:
 *   - only http/https protocols
 *   - no credentials embedded in the URL
 *   - loopback/private/link-local addresses rejected — EXCEPT when
 *     `allowLoopback` is set, which exists solely for local Ollama
 *     development (OLLAMA_BASE_URL on 127.0.0.1)
 *   - cloud metadata endpoints always rejected
 */

const METADATA_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.azure.com',
  'metadata.goog',
]);

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, b, Number(m[3]), Number(m[4])].some((n) => n > 255)) return false;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local (includes metadata)
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '');
  if (h === '::1' || h === '::') return true;
  const lower = h.toLowerCase();
  return lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
}

export interface UrlGuardResult {
  ok: boolean;
  /** Sanitized host for error messages (never the full URL with credentials). */
  host: string;
  reason?: string;
}

/**
 * Validate a base URL for an outbound provider call.
 * `allowLoopback` must only be true for explicitly local providers (Ollama).
 */
export function guardProviderUrl(rawUrl: string, { allowLoopback = false } = {}): UrlGuardResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, host: '(unparseable)', reason: 'Base URL is not a valid URL.' };
  }

  // URL.hostname preserves brackets for IPv6 — normalize to the bare address.
  const raw = parsed.hostname.toLowerCase();
  const host = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : raw;

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, host, reason: `Protocol "${parsed.protocol}" is not allowed — use http or https.` };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, host, reason: 'Credentials embedded in the URL are not allowed.' };
  }
  if (METADATA_HOSTS.has(host)) {
    return { ok: false, host, reason: 'Cloud metadata endpoints are blocked.' };
  }
  if (isPrivateIPv4(host) || isPrivateIPv6(host)) {
    if (allowLoopback && (host === '127.0.0.1' || host === '::1' || host === 'localhost')) {
      return { ok: true, host }; // explicitly local Ollama development
    }
    return {
      ok: false,
      host,
      reason: allowLoopback
        ? 'Private/internal network addresses other than loopback are blocked.'
        : 'Private/internal network addresses are blocked for remote providers.',
    };
  }
  return { ok: true, host };
}
