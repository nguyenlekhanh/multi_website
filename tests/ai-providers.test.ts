import { describe, expect, it } from 'vitest';
import { guardProviderUrl } from '@/lib/ai/url-guard';
import { parseArticleResponse } from '@/lib/ai/output-schema';
import { AiProviderError, isAiProviderType, providerAvailability } from '@/lib/ai/types';
import { createProvider, OllamaProvider } from '@/lib/ai/providers';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/ai/prompts';

/* ------------------------------- URL guard -------------------------------- */

describe('AI provider URL guard (SSRF prevention)', () => {
  it('accepts public https URLs', () => {
    expect(guardProviderUrl('https://api.openai.com/v1')).toEqual({ ok: true, host: 'api.openai.com' });
  });

  it('rejects cloud metadata endpoints', () => {
    expect(guardProviderUrl('http://169.254.169.254/latest/meta-data').ok).toBe(false);
    expect(guardProviderUrl('http://metadata.google.internal').ok).toBe(false);
  });

  it('rejects private ranges for remote providers', () => {
    expect(guardProviderUrl('http://10.0.0.5:8080/v1').ok).toBe(false);
    expect(guardProviderUrl('http://192.168.1.10/v1').ok).toBe(false);
    expect(guardProviderUrl('http://172.16.0.1/v1').ok).toBe(false);
  });

  it('rejects loopback for remote providers but allows it for local Ollama', () => {
    expect(guardProviderUrl('http://127.0.0.1:11434').ok).toBe(false);
    expect(guardProviderUrl('http://127.0.0.1:11434', { allowLoopback: true }).ok).toBe(true);
    expect(guardProviderUrl('http://localhost:11434', { allowLoopback: true }).ok).toBe(true);
    // loopback-allowed mode still blocks other private ranges
    expect(guardProviderUrl('http://192.168.1.5:11434', { allowLoopback: true }).ok).toBe(false);
    expect(guardProviderUrl('http://10.1.2.3:11434', { allowLoopback: true }).ok).toBe(false);
  });

  it('rejects non-http protocols and embedded credentials', () => {
    expect(guardProviderUrl('ftp://example.com').ok).toBe(false);
    expect(guardProviderUrl('file:///etc/passwd').ok).toBe(false);
    expect(guardProviderUrl('https://user:pass@example.com/v1').ok).toBe(false);
  });

  it('rejects IPv6 loopback/private for remote providers', () => {
    expect(guardProviderUrl('http://[::1]:11434').ok).toBe(false);
    expect(guardProviderUrl('http://[::1]:11434', { allowLoopback: true }).ok).toBe(true);
    expect(guardProviderUrl('http://[fe80::1]').ok).toBe(false);
  });
});

/* ---------------------------- output validation ---------------------------- */

const validArticle = {
  title: 'A perfectly reasonable article title',
  slug: 'a-perfectly-reasonable-article-title',
  excerpt: 'This is a sufficiently long excerpt that summarizes the article for lists and search results.',
  body: [
    'This is the first paragraph and it is long enough to pass validation without trouble at all.',
    'This is the second paragraph with plenty of words so the total word count clears the minimum threshold.',
    'A third paragraph rounds out the piece with additional detail and context for interested readers.',
  ],
  language: 'English',
  tags: ['testing', 'ai'],
  seoTitle: 'SEO title for the article',
  seoDescription: 'An SEO description with a reasonable length for search result display purposes.',
};

describe('AI article output parsing', () => {
  it('accepts a well-formed object', () => {
    const parsed = parseArticleResponse(validArticle, 100);
    expect(parsed.title).toBe(validArticle.title);
    expect(parsed.wordCount).toBeGreaterThan(30);
  });

  it('parses JSON wrapped in prose and code fences', () => {
    const wrapped = 'Here is the article:\n\n```json\n' + JSON.stringify(validArticle) + '\n```\nDone.';
    const parsed = parseArticleResponse(wrapped, 100);
    expect(parsed.slug).toBe(validArticle.slug);
  });

  it('rejects non-JSON strings', () => {
    expect(() => parseArticleResponse('I could not write that article.', 100)).toThrow(AiProviderError);
  });

  it('rejects too-short titles and excerpts', () => {
    expect(() => parseArticleResponse({ ...validArticle, title: 'No' }, 100)).toThrow(AiProviderError);
    expect(() => parseArticleResponse({ ...validArticle, excerpt: 'short' }, 100)).toThrow(AiProviderError);
  });

  it('rejects bodies under the word-count floor', () => {
    const thin = { ...validArticle, body: ['Twenty characters exactly here.', 'Another short one here now.'] };
    expect(() => parseArticleResponse(thin, 800)).toThrow(AiProviderError);
  });

  it('rejects arrays and null', () => {
    expect(() => parseArticleResponse([validArticle], 100)).toThrow(AiProviderError);
    expect(() => parseArticleResponse(null, 100)).toThrow(AiProviderError);
  });

  it('sanitizes markdown artifacts and slugifies dirty slugs', () => {
    const marked = {
      ...validArticle,
      body: ['## A heading-looking paragraph with enough words to pass validation.', ...validArticle.body.slice(1)],
      slug: 'NOT VALID SLUG!!',
    };
    const parsed = parseArticleResponse(marked, 100);
    expect(parsed.body[0]).not.toMatch(/^#/);
    // a salvageable slug is slugified rather than discarded
    expect(parsed.slug).toBe('not-valid-slug');
    // an empty slug falls back to the title
    const noSlug = parseArticleResponse({ ...validArticle, slug: '' }, 100);
    expect(noSlug.slug).toBe(validArticle.slug);
  });
});

/* ------------------------------ provider factory --------------------------- */

describe('provider factory', () => {
  it('validates provider types', () => {
    expect(isAiProviderType('ollama')).toBe(true);
    expect(isAiProviderType('openai')).toBe(true);
    expect(isAiProviderType('openai-compatible')).toBe(true);
    expect(isAiProviderType('claude')).toBe(false);
  });

  it('refuses ollama when OLLAMA_BASE_URL is unset', () => {
    expect(() => createProvider('ollama', {})).toThrow(AiProviderError);
  });

  it('constructs ollama with loopback allowed', () => {
    const p = createProvider('ollama', { OLLAMA_BASE_URL: 'http://127.0.0.1:11434' });
    expect(p).toBeInstanceOf(OllamaProvider);
  });

  it('refuses openai without an API key', () => {
    expect(() => createProvider('openai', {})).toThrow(AiProviderError);
  });

  it('constructs openai with defaults to the official endpoint', () => {
    const p = createProvider('openai', { OPENAI_API_KEY: 'test-key' });
    expect(p.type).toBe('openai');
  });

  it('refuses openai-compatible without both base URL and key', () => {
    expect(() => createProvider('openai-compatible', { OPENAI_COMPAT_BASE_URL: 'https://api.mistral.ai/v1' })).toThrow(AiProviderError);
  });

  it('reports availability without leaking key values', () => {
    const availability = providerAvailability();
    expect(availability).toHaveLength(3);
    for (const entry of availability) {
      expect(entry.note).not.toMatch(/sk-[a-zA-Z0-9]+/);
      expect(entry.note).not.toMatch(/Bearer/);
    }
  });
});

/* --------------------------------- prompts --------------------------------- */

describe('prompt templates', () => {
  const ctx = {
    config: {
      language: 'English', tone: 'professional', audience: 'IT leaders',
      wordCountTarget: 600, format: 'article', customInstructions: 'Avoid hype.',
    },
    siteName: 'Northbeam Systems',
    siteTagline: 'Cloud engineering',
    topicTitle: 'Cost control as a feature',
    keywords: ['cloud', 'finops'],
    excluded: ['vendor drama'],
    categoryNames: ['Engineering'],
    recentTitles: ['An older article'],
  };

  it('system prompt establishes the JSON contract and no-fabrication rules', () => {
    const system = buildSystemPrompt();
    expect(system).toContain('JSON');
    expect(system).toContain('never invent');
  });

  it('user prompt carries site/topic data but never system-rule overrides', () => {
    const user = buildUserPrompt(ctx);
    expect(user).toContain('Northbeam Systems');
    expect(user).toContain('Cost control as a feature');
    expect(user).toContain('finops');
    expect(user).toContain('Avoid hype.');
    // untrusted topic content stays in the user message, not the system prompt
    expect(buildSystemPrompt()).not.toContain('Cost control');
  });

  it('includes recent titles for duplicate avoidance', () => {
    expect(buildUserPrompt({ ...ctx, avoidTitle: 'Exact Duplicate' })).toContain('Exact Duplicate');
  });
});
