import { AiProviderError, type AiProviderType } from './types';
import { guardProviderUrl } from './url-guard';

/**
 * Provider implementations. Each provider:
 *   - validates its base URL against the SSRF guard (loopback only for Ollama)
 *   - enforces a timeout with AbortController
 *   - returns parsed structured output or a sanitized AiProviderError
 *
 * API keys are read from environment variables inside the provider and are
 * never logged, returned, or included in error messages.
 */

export interface GenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Model identifier within the provider. */
  model: string;
  timeoutMs: number;
}

export interface TestConnectionResult {
  ok: boolean;
  /** Model identifiers advertised by the provider (Ollama), when available. */
  models?: string[];
  /** Safe note for the UI (never includes keys or full auth headers). */
  note: string;
}

export interface AiProvider {
  readonly type: AiProviderType;
  testConnection(model?: string): Promise<TestConnectionResult>;
  generate(request: GenerateRequest): Promise<unknown>;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiProviderError('TIMEOUT', `The provider did not respond within ${Math.round(timeoutMs / 1000)}s.`);
    }
    const message = error instanceof Error ? error.message : 'network error';
    throw new AiProviderError('NETWORK', `Could not reach the provider (${message}).`);
  } finally {
    clearTimeout(timer);
  }
}

function assertGuarded(baseUrl: string, type: AiProviderType): void {
  const guard = guardProviderUrl(baseUrl, { allowLoopback: type === 'ollama' });
  if (!guard.ok) {
    throw new AiProviderError('CONFIG', `Provider base URL rejected: ${guard.reason}`);
  }
}

/* --------------------------------- Ollama --------------------------------- */

export class OllamaProvider implements AiProvider {
  readonly type: AiProviderType = 'ollama';
  constructor(private readonly baseUrl: string) {
    assertGuarded(baseUrl, 'ollama');
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/api/tags`, { method: 'GET' }, 10_000);
      if (!res.ok) {
        return { ok: false, note: `Ollama responded with status ${res.status}.` };
      }
      const data = (await res.json()) as { models?: { name: string }[] };
      const models = (data.models ?? []).map((m) => m.name);
      return { ok: true, models, note: `Ollama reachable — ${models.length} local model(s) available.` };
    } catch (error) {
      return { ok: false, note: error instanceof AiProviderError ? error.message : 'Ollama is not reachable.' };
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetchWithTimeout(`${this.baseUrl}/api/tags`, { method: 'GET' }, 10_000);
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name);
  }

  async generate(request: GenerateRequest): Promise<unknown> {
    const res = await fetchWithTimeout(
      `${this.baseUrl}/api/generate`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          prompt: `${request.systemPrompt}\n\n${request.userPrompt}`,
          stream: false,
          format: 'json',
          options: { temperature: 0.7 },
        }),
      },
      request.timeoutMs,
    );
    if (!res.ok) {
      throw new AiProviderError('NETWORK', `Ollama returned status ${res.status}. Is the model "${request.model}" pulled?`);
    }
    const data = (await res.json()) as { response?: string };
    if (typeof data.response !== 'string') {
      throw new AiProviderError('BAD_RESPONSE', 'Ollama returned an empty response.');
    }
    return data.response;
  }
}

/* --------------------------- OpenAI / compatible --------------------------- */

class OpenAIStyleProvider implements AiProvider {
  readonly type: AiProviderType;
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    type: AiProviderType,
  ) {
    assertGuarded(baseUrl, type);
    this.type = type;
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const res = await fetchWithTimeout(
        `${this.baseUrl}/models`,
        { method: 'GET', headers: this.authHeaders() },
        10_000,
      );
      if (res.status === 401) return { ok: false, note: 'Authentication failed — check the configured API key.' };
      if (!res.ok) return { ok: false, note: `Provider responded with status ${res.status}.` };
      const data = (await res.json()) as { data?: { id: string }[] };
      return { ok: true, note: `Provider reachable — ${(data.data ?? []).length} model(s) listed.` };
    } catch (error) {
      return { ok: false, note: error instanceof AiProviderError ? error.message : 'Provider is not reachable.' };
    }
  }

  async generate(request: GenerateRequest): Promise<unknown> {
    const res = await fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: { ...this.authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      },
      request.timeoutMs,
    );
    if (res.status === 401) throw new AiProviderError('CONFIG', 'Authentication failed — check the configured API key.');
    if (res.status === 429) throw new AiProviderError('RATE_LIMIT', 'The provider rate limit was hit. Try again later.');
    if (!res.ok) throw new AiProviderError('NETWORK', `The provider returned status ${res.status}.`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new AiProviderError('BAD_RESPONSE', 'The provider returned an empty completion.');
    }
    return content;
  }

  private authHeaders(): Record<string, string> {
    return { authorization: `Bearer ${this.apiKey}` };
  }
}

/* --------------------------------- factory -------------------------------- */

export interface ProviderEnv {
  OLLAMA_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_COMPAT_BASE_URL?: string;
  OPENAI_COMPAT_API_KEY?: string;
}

export function createProvider(type: AiProviderType, env: ProviderEnv = process.env as unknown as ProviderEnv): AiProvider {
  switch (type) {
    case 'ollama': {
      const baseUrl = env.OLLAMA_BASE_URL;
      if (!baseUrl) {
        throw new AiProviderError('CONFIG', 'OLLAMA_BASE_URL is not configured on the server.');
      }
      return new OllamaProvider(baseUrl);
    }
    case 'openai': {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) throw new AiProviderError('CONFIG', 'OPENAI_API_KEY is not configured on the server.');
      const baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
      return new OpenAIStyleProvider(baseUrl, apiKey, 'openai');
    }
    case 'openai-compatible': {
      const baseUrl = env.OPENAI_COMPAT_BASE_URL;
      const apiKey = env.OPENAI_COMPAT_API_KEY;
      if (!baseUrl || !apiKey) {
        throw new AiProviderError('CONFIG', 'OPENAI_COMPAT_BASE_URL and OPENAI_COMPAT_API_KEY must both be configured.');
      }
      return new OpenAIStyleProvider(baseUrl.replace(/\/$/, ''), apiKey, 'openai-compatible');
    }
    default: {
      const exhaustive: never = type;
      throw new AiProviderError('CONFIG', `Unknown provider type: ${String(exhaustive)}`);
    }
  }
}
