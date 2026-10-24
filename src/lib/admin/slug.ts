/**
 * Slug generation and validation.
 *
 * Slugs are user-editable; this helper only produces the initial suggestion
 * from a title. Existing slugs are NEVER regenerated when a title changes —
 * preserving public URLs is more important than cosmetic consistency.
 */

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 80 && SLUG_PATTERN.test(slug);
}

/** Reserved slugs that would collide with platform routes. */
export const RESERVED_SLUGS = new Set([
  'posts', 'categories', 'preview', 'api', 'admin', 'images', '_next', 'favicon.ico',
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
