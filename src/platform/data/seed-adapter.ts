import type {
  Category,
  CategoryWithCount,
  Page,
  Post,
  Site,
} from '../types';
import type { DataAdapter } from './adapter';
import { normalizeHost } from '../domain';
import { seedAuthors, seedCategories, seedPages, seedPosts, seedSites } from './seed';
import { getThemeOverride, setThemeOverride } from './store';

/**
 * Seed-data implementation of the DataAdapter contract.
 *
 * All lookups are keyed by `siteId` first — every method filters the shared
 * arrays by site, which is the mechanism that prevents cross-site content
 * leakage. A PostgreSQL adapter (docs/database.md) would keep the same
 * guarantee with a `WHERE site_id = $1` clause on every query.
 */
export class SeedDataAdapter implements DataAdapter {
  async listSites(): Promise<Site[]> {
    return seedSites.map(this.withEffectiveTheme);
  }

  async getSite(siteId: string): Promise<Site | null> {
    const site = seedSites.find((s) => s.id === siteId);
    return site ? this.withEffectiveTheme(site) : null;
  }

  async getSiteByHost(host: string): Promise<Site | null> {
    const normalized = normalizeHost(host);
    if (!normalized) return null;
    const site = seedSites.find((s) => s.domains.includes(normalized));
    return site ? this.withEffectiveTheme(site) : null;
  }

  async updateActiveTheme(siteId: string, themeId: string): Promise<Site | null> {
    const site = seedSites.find((s) => s.id === siteId);
    if (!site) return null;
    // Validated by the caller (server action) against the theme registry.
    // Seeds are immutable; the dev runtime store keeps the override.
    setThemeOverride(siteId, themeId);
    return this.withEffectiveTheme(site);
  }

  async listPages(siteId: string): Promise<Page[]> {
    return seedPages.filter((p) => p.siteId === siteId);
  }

  async getPage(siteId: string, slug: string): Promise<Page | null> {
    const page = seedPages.find((p) => p.siteId === siteId && p.slug === slug);
    return page ?? null;
  }

  async getHomepage(siteId: string): Promise<Page | null> {
    const page =
      seedPages.find((p) => p.siteId === siteId && p.isHomepage) ??
      seedPages.find((p) => p.siteId === siteId && p.slug === 'home');
    return page ?? null;
  }

  async listPosts(
    siteId: string,
    options?: { categorySlug?: string; limit?: number },
  ): Promise<Post[]> {
    let posts = seedPosts
      .filter((p) => p.siteId === siteId)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    if (options?.categorySlug) {
      const category = seedCategories.find(
        (c) => c.siteId === siteId && c.slug === options.categorySlug,
      );
      posts = category ? posts.filter((p) => p.categoryId === category.id) : [];
    }
    return options?.limit ? posts.slice(0, options.limit) : posts;
  }

  async getPost(siteId: string, slug: string): Promise<Post | null> {
    const post = seedPosts.find((p) => p.siteId === siteId && p.slug === slug);
    return post ?? null;
  }

  async listRelatedPosts(siteId: string, post: Post, limit = 3): Promise<Post[]> {
    const sameCategory = post.categoryId
      ? seedPosts.filter(
          (p) => p.siteId === siteId && p.slug !== post.slug && p.categoryId === post.categoryId,
        )
      : [];
    const others = seedPosts.filter(
      (p) => p.siteId === siteId && p.slug !== post.slug && p.categoryId !== post.categoryId,
    );
    return [...sameCategory, ...others].slice(0, limit);
  }

  async getCategory(siteId: string, slug: string): Promise<Category | null> {
    const category = seedCategories.find((c) => c.siteId === siteId && c.slug === slug);
    return category ?? null;
  }

  async listCategories(siteId: string): Promise<CategoryWithCount[]> {
    const categories: Category[] = seedCategories.filter((c) => c.siteId === siteId);
    return categories
      .map((category) => ({
        ...category,
        postCount: seedPosts.filter((p) => p.siteId === siteId && p.categoryId === category.id).length,
      }))
      .sort((a, b) => b.postCount - a.postCount);
  }

  private withEffectiveTheme(site: Site): Site {
    const override = getThemeOverride(site.id);
    return override ? { ...site, themeId: override } : site;
  }
}

export function normalizeHostForSeed(host: string | null | undefined): string | null {
  return normalizeHost(host);
}

export { seedAuthors, seedCategories, seedPages, seedPosts, seedSites };
