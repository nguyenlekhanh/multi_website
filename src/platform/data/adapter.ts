import type {
  Category,
  CategoryWithCount,
  Page,
  Post,
  Site,
} from '../types';

/**
 * Data layer contract.
 *
 * The MVP ships a seed-data adapter. To move to PostgreSQL later, implement
 * this interface against a real connection (see docs/database.md) and swap
 * the factory in `src/platform/data/index.ts`. Themes and pages only ever
 * talk to this interface, never to storage directly.
 */
export interface DataAdapter {
  /* Sites */
  listSites(): Promise<Site[]>;
  getSite(siteId: string): Promise<Site | null>;
  getSiteByHost(host: string): Promise<Site | null>;
  updateActiveTheme(siteId: string, themeId: string): Promise<Site | null>;

  /* Pages */
  listPages(siteId: string): Promise<Page[]>;
  getPage(siteId: string, slug: string): Promise<Page | null>;
  getHomepage(siteId: string): Promise<Page | null>;

  /* Posts */
  listPosts(siteId: string, options?: { categorySlug?: string; limit?: number }): Promise<Post[]>;
  getPost(siteId: string, slug: string): Promise<Post | null>;
  listRelatedPosts(siteId: string, post: Post, limit?: number): Promise<Post[]>;

  /* Categories */
  listCategories(siteId: string): Promise<CategoryWithCount[]>;
  getCategory(siteId: string, slug: string): Promise<Category | null>;
}
