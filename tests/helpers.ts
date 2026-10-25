/** Shared test helpers. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { seedAuthors, seedSites } from '@/platform/data/seed';
import type { Author } from '@/platform/types';

/** Load a directory as an in-memory package file map (theme packages). */
export function loadDirAsPackageFiles(root: string): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, `${prefix}${entry}/`);
      else files.set(`${prefix}${entry}`, new Uint8Array(readFileSync(full)));
    }
  };
  walk(root, '');
  return files;
}

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
