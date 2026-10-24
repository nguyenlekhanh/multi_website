/**
 * AI content automation — shared types, environment contract, and guards.
 *
 * Provider API keys NEVER live in the database and are NEVER returned to the
 * browser: they come exclusively from server-side environment variables.
 * Per-site configuration (AiSettings) only references a provider TYPE and a
 * model identifier.
 */

export type AiProviderType = 'ollama' | 'openai' | 'openai-compatible';

export const AI_PROVIDER_TYPES: AiProviderType[] = ['ollama', 'openai', 'openai-compatible'];

export function isAiProviderType(value: unknown): value is AiProviderType {
  return typeof value === 'string' && (AI_PROVIDER_TYPES as string[]).includes(value);
}

/** Which env-configured providers are available on this server. */
export interface ProviderAvailability {
  type: AiProviderType;
  available: boolean;
  /** Human-readable note; never contains secret values. */
  note: string;
}

export function providerAvailability(): ProviderAvailability[] {
  return [
    {
      type: 'ollama',
      available: Boolean(process.env.OLLAMA_BASE_URL),
      note: `Local models at ${process.env.OLLAMA_BASE_URL ? 'the configured OLLAMA_BASE_URL' : 'OLLAMA_BASE_URL (not set)'}. Local inference — no API key required.`,
    },
    {
      type: 'openai',
      available: Boolean(process.env.OPENAI_API_KEY),
      note: process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY is configured (value hidden).' : 'Requires OPENAI_API_KEY.',
    },
    {
      type: 'openai-compatible',
      available: Boolean(process.env.OPENAI_COMPAT_BASE_URL && process.env.OPENAI_COMPAT_API_KEY),
      note:
        process.env.OPENAI_COMPAT_BASE_URL && process.env.OPENAI_COMPAT_API_KEY
          ? 'OPENAI_COMPAT_BASE_URL and key are configured (values hidden).'
          : 'Requires OPENAI_COMPAT_BASE_URL and OPENAI_COMPAT_API_KEY.',
    },
  ];
}

/** A normalized per-site generation configuration (from AiSettings). */
export interface AiSiteConfig {
  siteId: string;
  enabled: boolean;
  provider: AiProviderType;
  model: string;
  language: string;
  tone: string;
  audience: string;
  wordCountTarget: number;
  format: string;
  authorId: string | null;
  categoryIds: string[];
  publishMode: 'DRAFT' | 'SCHEDULED' | 'AUTOPILOT';
  postsPerWeek: number;
  publishTimes: string[];
  timezone: string;
  maxAttempts: number;
  maxArticlesPerDay: number;
  customInstructions: string | null;
  paused: boolean;
}

/** The structured article contract every provider must return. */
export interface AiArticleDraft {
  title: string;
  slug: string;
  excerpt: string;
  body: string[];
  language: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface AiProvider {
  readonly type: AiProviderType;
  testConnection(model?: string): Promise<{ ok: boolean; models?: string[]; note: string }>;
  generate(request: {
    systemPrompt: string;
    userPrompt: string;
    model: string;
    timeoutMs: number;
  }): Promise<unknown>;
}

export class AiProviderError extends Error {
  readonly kind: 'CONFIG' | 'TIMEOUT' | 'NETWORK' | 'BAD_RESPONSE' | 'RATE_LIMIT' | 'UNKNOWN';
  constructor(kind: AiProviderError['kind'], message: string) {
    super(message);
    this.name = 'AiProviderError';
    this.kind = kind;
  }
}
