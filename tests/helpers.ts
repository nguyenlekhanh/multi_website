/** Shared test helpers. */
import { seedAuthors, seedSites } from '@/platform/data/seed';
import type { Author } from '@/platform/types';

/** Every hostname mapped across all seed sites. */
export function seedDomainsOf(): string[] {
  return seedSites.flatMap((s) => s.domains);
}

/** Authors with their site derived from the 'siteId:authorId' key. */
export function seedAuthorsOf(): (Author & { siteId: string })[] {
  return Object.entries(seedAuthors).map(([key, author]) => ({
    ...author,
    siteId: key.split(':')[0],
  }));
}

export { seedCategories, seedPages, seedPosts, seedSites } from '@/platform/data/seed';
