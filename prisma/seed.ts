/**
 * Demo-data import for PostgreSQL.
 *
 * Populates a fresh (or existing) database with the three demo sites and all
 * of their content, preserving the platform's stable identifiers:
 *
 *   site ids        'business-demo' | 'travel-demo' | 'blog-demo'
 *   domain hosts    business.demo.local (+ www alias), etc.
 *   theme ids       business | travel | blog
 *   category ids    'cat-strategy', 'cat-culture', ...
 *   author ids      'elena-voss', 'amara-chen', ...
 *   page/post slugs unchanged
 *
 * Idempotency: every row is written with an upsert on its stable key
 * (sites/categories/authors by id, domains by host, pages/posts by
 * (siteId, slug)), so running the script repeatedly converges to the same
 * state and never duplicates records. Re-running refreshes the demo rows
 * with fixture data — this is a DEMO importer, not a production migration:
 * it only ever touches the demo identifiers above. A safety check refuses
 * to run when NODE_ENV=production unless ALLOW_DEMO_SEED_IN_PROD=1.
 *
 * Run with: npm run db:seed   (uses DATABASE_URL)
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { seedAuthors, seedCategories, seedPages, seedPosts, seedSites } from '../src/platform/data/seed';
import { normalizeHost } from '../src/platform/domain';
import {
  validateBlocks,
  validateParagraphs,
  validateSiteSettings,
  ValidationError,
} from '../src/platform/data/validation';
import type { Block } from '../src/platform/types';

type Db = PrismaClient | Prisma.TransactionClient;

/** Narrow cast for validated fixture values into Prisma JSON columns. */
function json<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

/** Validate fixtures up front so a bad fixture fails before any write. */
function collectFixtures() {
  const sites = seedSites.map((site) => ({
    ...site,
    settings: validateSiteSettings(site.settings, `site "${site.id}" settings`),
  }));

  const pages = seedPages.map((page) => ({
    ...page,
    blocks: validateBlocks(page.blocks, `page "${page.siteId}/${page.slug}" blocks`),
  }));

  const posts = seedPosts.map((post) => ({
    ...post,
    body: validateParagraphs(post.body, `post "${post.siteId}/${post.slug}" body`),
  }));

  // Site-scoped media rows derived from every image reference in the content.
  const media = new Map<string, { siteId: string; src: string; alt: string }>();
  const addMedia = (siteId: string, src: string | undefined, alt: string | undefined) => {
    if (!src) return;
    const key = `${siteId}:${src}`;
    if (!media.has(key)) media.set(key, { siteId, src, alt: alt ?? '' });
  };
  for (const site of seedSites) {
    addMedia(site.id, site.settings.seo.socialImage, `${site.name} social image`);
  }
  for (const page of seedPages) {
    for (const block of page.blocks as Block[]) {
      switch (block.type) {
        case 'hero':
          addMedia(page.siteId, block.image, block.imageAlt);
          break;
        case 'intro':
          addMedia(page.siteId, block.image, block.imageAlt);
          break;
        case 'cards':
          for (const item of block.items) addMedia(page.siteId, item.image, item.imageAlt);
          break;
        case 'cta':
          addMedia(page.siteId, block.image, block.heading);
          break;
        default:
          break;
      }
    }
  }
  for (const post of seedPosts) {
    addMedia(post.siteId, post.coverImage, post.coverAlt);
  }

  // Authors are keyed 'siteId:authorId' in the seed file; derive the site.
  const authors = Object.entries(seedAuthors).map(([key, author]) => {
    const siteId = key.split(':')[0];
    if (!seedSites.some((s) => s.id === siteId)) {
      throw new ValidationError(`author "${author.id}" references unknown site "${siteId}"`);
    }
    return { ...author, siteId };
  });

  return { sites, categories: seedCategories, authors, pages, posts, media: [...media.values()] };
}

/**
 * Import the demo fixtures. Idempotent — safe to run repeatedly.
 * Returns a summary of upserted row counts.
 */
export async function seedDatabase(db: Db) {
  const fixtures = collectFixtures();
  const counts = { sites: 0, domains: 0, settings: 0, categories: 0, authors: 0, pages: 0, posts: 0, media: 0 };

  for (const site of fixtures.sites) {
    await db.site.upsert({
      where: { id: site.id },
      create: {
        id: site.id,
        name: site.name,
        themeId: site.themeId,
        status: 'ACTIVE',
      },
      update: {
        name: site.name,
        themeId: site.themeId,
        status: 'ACTIVE',
      },
    });
    counts.sites += 1;

    const { landingBlurb, ...settings } = site.settings;
    const settingsJson = { ...settings, extras: landingBlurb ? { landingBlurb } : undefined };
    const settingsData = {
      identity: json(settingsJson.identity),
      colors: json(settingsJson.colors),
      nav: json(settingsJson.nav),
      footerNav: json(settingsJson.footerNav),
      seo: json(settingsJson.seo),
      extras: json(settingsJson.extras ?? Prisma.JsonNull),
    };
    await db.siteSettings.upsert({
      where: { siteId: site.id },
      create: { siteId: site.id, ...settingsData },
      update: settingsData,
    });
    counts.settings += 1;

    for (let i = 0; i < site.domains.length; i += 1) {
      const host = normalizeHost(site.domains[i]);
      if (!host) throw new ValidationError(`site "${site.id}" has an invalid domain "${site.domains[i]}"`);
      await db.domain.upsert({
        where: { host },
        create: { siteId: site.id, host, isPrimary: i === 0, verified: true },
        update: { siteId: site.id, isPrimary: i === 0, verified: true },
      });
      counts.domains += 1;
    }
  }

  for (const category of fixtures.categories) {
    await db.category.upsert({
      where: { id: category.id },
      create: { ...category },
      update: { siteId: category.siteId, slug: category.slug, name: category.name, description: category.description ?? null },
    });
    counts.categories += 1;
  }

  for (const author of fixtures.authors) {
    const authorData = {
      id: author.id,
      siteId: author.siteId,
      slug: author.id,
      name: author.name,
      role: author.role ?? null,
      bio: author.bio ?? null,
      initials: author.initials,
      avatar: author.avatar ?? null,
    };
    await db.author.upsert({ where: { id: author.id }, create: authorData, update: authorData });
    counts.authors += 1;
  }

  for (const page of fixtures.pages) {
    const data = {
      siteId: page.siteId,
      slug: page.slug,
      title: page.title,
      eyebrow: page.eyebrow ?? null,
      seoTitle: page.seoTitle ?? null,
      seoDescription: page.seoDescription ?? null,
      ogImage: page.ogImage ?? null,
      isHomepage: page.isHomepage ?? false,
      status: 'PUBLISHED' as const,
      blocks: json(page.blocks),
      publishedAt: new Date(page.updatedAt),
    };
    await db.page.upsert({ where: { siteId_slug: { siteId: page.siteId, slug: page.slug } }, create: data, update: data });
    counts.pages += 1;
  }

  for (const post of fixtures.posts) {
    const data = {
      siteId: post.siteId,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: json(post.body),
      coverImage: post.coverImage ?? null,
      coverAlt: post.coverAlt ?? null,
      categoryId: post.categoryId ?? null,
      authorId: post.author.id,
      status: 'PUBLISHED' as const,
      featured: post.featured ?? false,
      readingMinutes: post.readingMinutes,
      tags: post.tags ?? [],
      publishedAt: new Date(post.publishedAt),
    };
    await db.post.upsert({ where: { siteId_slug: { siteId: post.siteId, slug: post.slug } }, create: data, update: data });
    counts.posts += 1;
  }

  for (const item of fixtures.media) {
    await db.media.upsert({
      where: { siteId_src: { siteId: item.siteId, src: item.src } },
      create: { siteId: item.siteId, src: item.src, alt: item.alt, kind: 'image' },
      update: { alt: item.alt, kind: 'image' },
    });
    counts.media += 1;
  }

  return counts;
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED_IN_PROD !== '1') {
    console.error(
      '[seed] Refusing to import demo data with NODE_ENV=production. ' +
        'Set ALLOW_DEMO_SEED_IN_PROD=1 only if this database is meant to hold the demo sites.',
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('[seed] DATABASE_URL is required (e.g. postgresql://user:password@host:5432/db).');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const counts = await seedDatabase(prisma);
    console.log(
      '[seed] Demo data import complete (upserts, no duplicates):',
      JSON.stringify(counts),
    );
  } finally {
    await prisma.$disconnect();
  }
}

// CLI entry (imported as a module by tests, which call seedDatabase directly).
if (process.argv[1]?.replace(/\\/g, '/').endsWith('prisma/seed.ts')) {
  main().catch((error) => {
    console.error('[seed] Import failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
