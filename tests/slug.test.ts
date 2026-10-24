import { describe, expect, it } from 'vitest';
import { isReservedSlug, isValidSlug, slugify } from '@/lib/admin/slug';

describe('slug utilities', () => {
  it('slugifies titles', () => {
    expect(slugify('What a Good Strategy Review Actually Changes')).toBe(
      'what-a-good-strategy-review-actually-changes',
    );
    expect(slugify('Kyoto in autumn: a slow travel guide!')).toBe('kyoto-in-autumn-a-slow-travel-guide');
    expect(slugify('  Multiple   spaces & symbols?  ')).toBe('multiple-spaces-symbols');
  });

  it('strips accents and handles edge cases', () => {
    expect(slugify('Café Culture in São Paulo')).toBe('cafe-culture-in-sao-paulo');
    expect(slugify('---')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('caps length at 80 characters and trims trailing hyphens', () => {
    const long = 'w'.repeat(100) + '-end';
    const result = slugify(long);
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith('-')).toBe(false);
  });

  it('validates slugs strictly', () => {
    expect(isValidSlug('valid-slug-1')).toBe(true);
    expect(isValidSlug('Valid-Slug')).toBe(false);
    expect(isValidSlug('-leading')).toBe(false);
    expect(isValidSlug('trailing-')).toBe(false);
    expect(isValidSlug('double--hyphen')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });

  it('protects reserved platform slugs', () => {
    expect(isReservedSlug('posts')).toBe(true);
    expect(isReservedSlug('admin')).toBe(true);
    expect(isReservedSlug('categories')).toBe(true);
    expect(isReservedSlug('about-us')).toBe(false);
  });
});
