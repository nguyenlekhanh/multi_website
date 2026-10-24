import { describe, expect, it } from 'vitest';
import { getTheme, isRegisteredTheme, listThemes } from '@/platform/registry';

describe('theme registry', () => {
  it('registers the three demo themes', () => {
    const ids = listThemes().map((t) => t.id).sort();
    expect(ids).toEqual(['agency', 'blog', 'business', 'it', 'news', 'portfolio', 'travel']);
  });

  it('returns a theme by id', () => {
    expect(getTheme('travel').id).toBe('travel');
  });

  it('falls back to the business theme for unknown ids', () => {
    const theme = getTheme('totally-bogus-theme');
    expect(theme.id).toBe('business');
  });

  it('registers the four Phase 5 themes with full metadata', () => {
    for (const id of ['portfolio', 'news', 'it', 'agency']) {
      const theme = getTheme(id);
      expect(theme.id).toBe(id);
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.description.length).toBeGreaterThan(0);
      expect(theme.supportsPosts).toBe(true);
    }
  });

  it('falls back for null/undefined ids', () => {
    expect(getTheme(null).id).toBe('business');
    expect(getTheme(undefined).id).toBe('business');
  });

  it('validates theme ids', () => {
    expect(isRegisteredTheme('blog')).toBe(true);
    expect(isRegisteredTheme('nope')).toBe(false);
    expect(isRegisteredTheme(null)).toBe(false);
  });

  it('every theme implements the full contract', () => {
    for (const theme of listThemes()) {
      expect(theme.layout, `${theme.id}.layout`).toBeTypeOf('function');
      expect(theme.home, `${theme.id}.home`).toBeTypeOf('function');
      expect(theme.page, `${theme.id}.page`).toBeTypeOf('function');
      expect(theme.postList, `${theme.id}.postList`).toBeTypeOf('function');
      expect(theme.post, `${theme.id}.post`).toBeTypeOf('function');
      expect(theme.categories, `${theme.id}.categories`).toBeTypeOf('function');
      expect(theme.notFound, `${theme.id}.notFound`).toBeTypeOf('function');
    }
  });
});
