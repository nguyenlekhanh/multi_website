import { AiProviderError } from './types';
import { isValidSlug, slugify } from '@/lib/admin/slug';

/**
 * Structured output contract + validation.
 *
 * Every provider must produce this shape; anything malformed is rejected
 * server-side before it can reach the CMS. No HTML is accepted anywhere —
 * the body is plain paragraphs matching the existing Post model.
 */

export const WORD_COUNT_MIN = 150;
export const WORD_COUNT_MAX = 2500;
export const TITLE_MAX = 200;
export const EXCERPT_MAX = 500;
export const BODY_MAX_PARAGRAPHS = 40;
export const BODY_PARAGRAPH_MAX = 2000;
export const TAGS_MAX = 10;

export interface RawArticle {
  title: string;
  slug: string;
  excerpt: string;
  body: string[];
  language: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface ParsedArticle extends RawArticle {
  wordCount: number;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean) : [];
}

/**
 * Parse and validate a model response. Accepts either an object or a JSON
 * string (models frequently wrap JSON in prose/fences). Throws
 * AiProviderError(BAD_RESPONSE) with a safe message on any violation.
 */
export function parseArticleResponse(raw: unknown, targetWords: number): ParsedArticle {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new AiProviderError('BAD_RESPONSE', 'The model response did not contain structured article data.');
    }
    try {
      data = JSON.parse(text.slice(start, end + 1));
    } catch {
      throw new AiProviderError('BAD_RESPONSE', 'The model response was not valid JSON.');
    }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new AiProviderError('BAD_RESPONSE', 'The model response was not an article object.');
  }
  const obj = data as Record<string, unknown>;

  const title = asString(obj.title);
  if (title.length < 5 || title.length > TITLE_MAX) {
    throw new AiProviderError('BAD_RESPONSE', `Article title must be 5-${TITLE_MAX} characters.`);
  }

  const excerpt = asString(obj.excerpt);
  if (excerpt.length < 20 || excerpt.length > EXCERPT_MAX) {
    throw new AiProviderError('BAD_RESPONSE', `Article excerpt must be 20-${EXCERPT_MAX} characters.`);
  }

  const body = asStringArray(obj.body);
  if (body.length < 2 || body.length > BODY_MAX_PARAGRAPHS) {
    throw new AiProviderError('BAD_RESPONSE', `Article body must contain 2-${BODY_MAX_PARAGRAPHS} paragraphs.`);
  }
  if (body.some((p) => p.length < 20 || p.length > BODY_PARAGRAPH_MAX)) {
    throw new AiProviderError('BAD_RESPONSE', 'One or more body paragraphs are empty or too long.');
  }
  const wordCount = body.join(' ').split(/\s+/).filter(Boolean).length;
  if (wordCount < Math.min(WORD_COUNT_MIN, targetWords * 0.4)) {
    throw new AiProviderError(
      'BAD_RESPONSE',
      `Article body is too short (${wordCount} words; target ${targetWords}).`,
    );
  }
  if (wordCount > WORD_COUNT_MAX + targetWords) {
    throw new AiProviderError('BAD_RESPONSE', `Article body is too long (${wordCount} words).`);
  }

  // Sanitized HTML-entity-style or markdown headings in paragraphs are not
  // part of the contract — strip markdown heading markers defensively.
  const cleanBody = body.map((p) => p.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, ''));

  const rawSlug = asString(obj.slug);
  const slug =
    rawSlug.trim() !== ''
      ? slugify(rawSlug)
      : slugify(title);
  if (!isValidSlug(slug)) {
    throw new AiProviderError('BAD_RESPONSE', 'The generated slug is not a valid URL slug.');
  }

  const tags = asStringArray(obj.tags).slice(0, TAGS_MAX).map((t) => t.slice(0, 40));
  const language = asString(obj.language) || 'English';
  const seoTitle = asString(obj.seoTitle).slice(0, TITLE_MAX) || title;
  const seoDescription = asString(obj.seoDescription).slice(0, 300) || excerpt;

  return { title, slug, excerpt, body: cleanBody, language, tags, seoTitle, seoDescription, wordCount };
}
