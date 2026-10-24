import type { PrismaClient } from '@prisma/client';
import type { Category, CategoryWithCount, Page, Post, Site } from '../types';
import type { DataAdapter } from './adapter';
import { normalizeHost } from '../domain';
import { DataUnavailableError, wrapDbError } from './errors';
import { validateBlocks, validateParagraphs, validateSiteSettings } from './validation';

/**
 * PostgreSQL implementation of the DataAdapter contract (Prisma ORM).
 *
 * Rules enforced here:
 *  - Every content lookup is scoped by siteId in the WHERE clause — a record
 *    belonging to another site is indistinguishable from a missing one (404).
 *  - Only published content is returned; drafts exist in the database but
 *    never render until their status flips.
 *  - Hostnames are normalized through platform/domain.ts before lookup; the
 *    unique constraint on domains.host makes one host resolve to one site.
 *  - Prisma queries are fully parameterized (no string-built SQL).
 *  - All errors are wrapped into DataUnavailableError — callers never see raw
 *    driver errors, so nothing internal can leak into a response.
 */

export class PostgresDataAdapter implements DataAdapter {
  private readonly prisma: PrismaClient;

  constructor(client: PrismaClient) {
    this.prisma = client;
  }

  /* --------------------------------- Sites -------------------------------- */

  async listSites(): Promise<Site[]> {
    const rows = await this.safe(
      this.prisma.site.findMany({
        where: { status: 'ACTIVE' },
        include: { domains: true, settings: true },
        orderBy: { id: 'asc' },
      }),
      'list sites',
    );
    return rows.map(mapSite);
  }

  async getSite(siteId: string): Promise<Site | null> {
    const row = await this.safe(
      this.prisma.site.findUnique({
        where: { id: siteId },
        include: { domains: true, settings: true },
      }),
      `get site "${siteId}"`,
    );
    return row && row.status === 'ACTIVE' ? mapSite(row) : null;
  }

  async getSiteByHost(host: string): Promise<Site | null> {
    const normalized = normalizeHost(host);
    if (!normalized) return null;
    const row = await this.safe(
      this.prisma.domain.findUnique({
        where: { host: normalized },
        include: { site: { include: { domains: true, settings: true } } },
      }),
      `resolve domain "${normalized}"`,
    );
    return row && row.site.status === 'ACTIVE' ? mapSite(row.site) : null;
  }

  async updateActiveTheme(siteId: string, themeId: string): Promise<Site | null> {
    const row = await this.safe(
      this.prisma.site.update({
        where: { id: siteId },
        data: { themeId },
        include: { domains: true, settings: true },
      }),
      `update theme for site "${siteId}"`,
    );
    return mapSite(row);
  }

  /* --------------------------------- Pages -------------------------------- */

  async listPages(siteId: string): Promise<Page[]> {
    const rows = await this.safe(
      this.prisma.page.findMany({
        where: { siteId, status: 'PUBLISHED' },
        orderBy: { slug: 'asc' },
      }),
      `list pages for site "${siteId}"`,
    );
    return rows.map(mapPage);
  }

  async getPage(siteId: string, slug: string): Promise<Page | null> {
    const row = await this.safe(
      this.prisma.page.findUnique({
        where: { siteId_slug: { siteId, slug } },
      }),
      `get page "${slug}" for site "${siteId}"`,
    );
    return row && row.status === 'PUBLISHED' ? mapPage(row) : null;
  }

  async getHomepage(siteId: string): Promise<Page | null> {
    const row = await this.safe(
      this.prisma.page.findFirst({
        where: { siteId, isHomepage: true, status: 'PUBLISHED' },
        orderBy: { slug: 'asc' },
      }),
      `get homepage for site "${siteId}"`,
    );
    if (row) return mapPage(row);
    const fallback = await this.getPage(siteId, 'home');
    return fallback;
  }

  /* --------------------------------- Posts -------------------------------- */

  async listPosts(
    siteId: string,
    options?: { categorySlug?: string; limit?: number },
  ): Promise<Post[]> {
    const rows = await this.safe(
      this.prisma.post.findMany({
        where: {
          siteId,
          status: 'PUBLISHED',
          ...(options?.categorySlug ? { category: { slug: options.categorySlug, siteId } } : {}),
        },
        include: { author: true },
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        ...(options?.limit ? { take: options.limit } : {}),
      }),
      `list posts for site "${siteId}"`,
    );
    return rows.map(mapPost);
  }

  async getPost(siteId: string, slug: string): Promise<Post | null> {
    const row = await this.safe(
      this.prisma.post.findUnique({
        where: { siteId_slug: { siteId, slug } },
        include: { author: true },
      }),
      `get post "${slug}" for site "${siteId}"`,
    );
    return row && row.status === 'PUBLISHED' ? mapPost(row) : null;
  }

  async listRelatedPosts(siteId: string, post: Post, limit = 3): Promise<Post[]> {
    const rows = await this.safe(
      this.prisma.post.findMany({
        where: { siteId, status: 'PUBLISHED', slug: { not: post.slug } },
        include: { author: true },
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      }),
      `list related posts for site "${siteId}"`,
    );
    const mapped = rows.map(mapPost);
    const sameCategory = post.categoryId ? mapped.filter((p) => p.categoryId === post.categoryId) : [];
    const others = mapped.filter((p) => p.categoryId !== post.categoryId);
    return [...sameCategory, ...others].slice(0, limit);
  }

  /* ------------------------------ Categories ------------------------------ */

  async listCategories(siteId: string): Promise<CategoryWithCount[]> {
    const [categories, counts] = await Promise.all([
      this.safe(
        this.prisma.category.findMany({ where: { siteId }, orderBy: { name: 'asc' } }),
        `list categories for site "${siteId}"`,
      ),
      this.safe(
        this.prisma.post.groupBy({
          by: ['categoryId'],
          where: { siteId, status: 'PUBLISHED', categoryId: { not: null } },
          _count: { categoryId: true },
        }),
        `count posts per category for site "${siteId}"`,
      ),
    ]);
    const countByCategory = new Map(counts.map((c) => [c.categoryId, c._count.categoryId]));
    return categories.map((c) => ({
      id: c.id,
      siteId: c.siteId,
      slug: c.slug,
      name: c.name,
      description: c.description ?? undefined,
      postCount: countByCategory.get(c.id) ?? 0,
    }));
  }

  async getCategory(siteId: string, slug: string): Promise<Category | null> {
    const row = await this.safe(
      this.prisma.category.findUnique({ where: { siteId_slug: { siteId, slug } } }),
      `get category "${slug}" for site "${siteId}"`,
    );
    return row ? { siteId: row.siteId, id: row.id, slug: row.slug, name: row.name, description: row.description ?? undefined } : null;
  }

  /* -------------------------------- helpers ------------------------------- */

  /** Upper bound for any single database round-trip (our queries are small;
   *  this converts a silently-dead connection into a clean failure instead
   *  of an indefinitely hanging request). */
  private static readonly QUERY_TIMEOUT_MS = 30_000;

  /**
   * Await a Prisma call and convert any failure into DataUnavailableError so
   * request handlers never leak driver errors or connection strings.
   */
  private async safe<T>(operation: Promise<T>, context: string): Promise<T> {
    try {
      const timeout = new Promise<never>((_, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new DataUnavailableError(
                `Database operation timed out while trying to ${context}.`,
              ),
            ),
          PostgresDataAdapter.QUERY_TIMEOUT_MS,
        );
        if (typeof timer.unref === 'function') timer.unref();
      });
      return await Promise.race([operation, timeout]);
    } catch (error) {
      throw wrapDbError(error, context);
    }
  }
}

/* ------------------------------ row → domain ------------------------------ */

function mapSite(row: {
  id: string;
  name: string;
  themeId: string;
  createdAt: Date;
  updatedAt: Date;
  domains: { host: string; isPrimary: boolean }[];
  settings: { identity: unknown; colors: unknown; nav: unknown; footerNav: unknown; seo: unknown; extras: unknown } | null;
}): Site {
  if (!row.settings) {
    throw new DataUnavailableError(`Site "${row.id}" has no settings record.`);
  }
  const settings = validateSiteSettings(
    {
      identity: row.settings.identity,
      colors: row.settings.colors,
      nav: row.settings.nav,
      footerNav: row.settings.footerNav,
      seo: row.settings.seo,
      extras: row.settings.extras ?? undefined,
    },
    `site "${row.id}" settings`,
  );
  const sorted = [...row.domains].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return {
    id: row.id,
    name: row.name,
    domain: sorted[0]?.host ?? row.id,
    domains: sorted.map((d) => d.host),
    themeId: row.themeId,
    settings,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPage(row: {
  siteId: string;
  slug: string;
  title: string;
  eyebrow: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  isHomepage: boolean;
  blocks: unknown;
  updatedAt: Date;
  publishedAt: Date | null;
}): Page {
  return {
    siteId: row.siteId,
    slug: row.slug,
    title: row.title,
    eyebrow: row.eyebrow ?? undefined,
    seoTitle: row.seoTitle ?? undefined,
    seoDescription: row.seoDescription ?? undefined,
    ogImage: row.ogImage ?? undefined,
    isHomepage: row.isHomepage,
    blocks: validateBlocks(row.blocks, `page "${row.siteId}/${row.slug}" blocks`),
    updatedAt: (row.publishedAt ?? row.updatedAt).toISOString(),
  };
}

function mapPost(row: {
  siteId: string;
  slug: string;
  title: string;
  excerpt: string;
  body: unknown;
  coverImage: string | null;
  coverAlt: string | null;
  categoryId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  readingMinutes: number;
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; role: string | null; bio: string | null; initials: string; avatar: string | null };
}): Post {
  return {
    siteId: row.siteId,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: validateParagraphs(row.body, `post "${row.siteId}/${row.slug}" body`),
    coverImage: row.coverImage ?? undefined,
    coverAlt: row.coverAlt ?? undefined,
    categoryId: row.categoryId ?? undefined,
    seoTitle: row.seoTitle ?? undefined,
    seoDescription: row.seoDescription ?? undefined,
    tags: row.tags,
    author: {
      id: row.author.id,
      name: row.author.name,
      role: row.author.role ?? undefined,
      bio: row.author.bio ?? undefined,
      initials: row.author.initials,
      avatar: row.author.avatar ?? undefined,
    },
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    readingMinutes: row.readingMinutes,
    featured: row.featured,
  };
}
