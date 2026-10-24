import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { PostgresDataAdapter } from '@/platform/data/postgres-adapter';
import { seedDatabase } from '../prisma/seed';

/**
 * Integration tests against a real PostgreSQL database.
 *
 * Skipped unless TEST_DATABASE_URL is set — ordinary unit tests never
 * require a database. The database must already exist; migrations are
 * applied idempotently by this suite (prisma migrate deploy) and the demo
 * fixtures are imported through the same seedDatabase() function the
 * `npm run db:seed` CLI uses.
 *
 * Points ONLY at a disposable test database (guarded below) — never at a
 * production database.
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const prisma = TEST_DATABASE_URL
  ? new PrismaClient({
      datasources: { db: { url: `${TEST_DATABASE_URL}${TEST_DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=3` } },
    })
  : (null as unknown as PrismaClient);

const d = TEST_DATABASE_URL ? new PostgresDataAdapter(prisma) : (null as unknown as PostgresDataAdapter);

describe.skipIf(!TEST_DATABASE_URL)('PostgresDataAdapter (integration)', () => {
  beforeAll(async () => {
    if (!/test|localhost|127\.0\.0\.1/.test(TEST_DATABASE_URL!)) {
      throw new Error('TEST_DATABASE_URL must point at a disposable local/test database.');
    }

    // Apply migrations idempotently (no destructive reset). If the prisma CLI
    // cannot run in this environment (no network/CLI available), fall back to
    // verifying the schema directly — the suites below need the tables only.
    const { execSync } = await import('node:child_process');
    try {
      execSync(`npx prisma migrate deploy`, {
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        cwd: __dirname + '/..',
        timeout: 120_000,
        windowsHide: true,
      });
    } catch {
      const tables = await prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT count(*) AS count FROM information_schema.tables WHERE table_schema = 'public' AND tablename IN ('sites','domains','pages','posts')`,
      );
      if (Number(tables[0].count) < 4) {
        throw new Error(
          'Could not apply migrations and tables are missing. Run: DATABASE_URL=$TEST_DATABASE_URL npm run db:deploy',
        );
      }
    }

    // Clean slate, then import fixtures through the production seed path.
    await prisma.media.deleteMany();
    await prisma.post.deleteMany();
    await prisma.page.deleteMany();
    await prisma.author.deleteMany();
    await prisma.category.deleteMany();
    await prisma.domain.deleteMany();
    await prisma.siteSettings.deleteMany();
    await prisma.site.deleteMany();
    await seedDatabase(prisma);
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it('applies the full schema', async () => {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>(
      Prisma.sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    const names = tables.map((t) => t.tablename).sort();
    for (const expected of ['authors', 'categories', 'domains', 'media', 'pages', 'posts', 'site_settings', 'sites']) {
      expect(names).toContain(expected);
    }
  });

  it('imports all three demo sites with domains and settings', async () => {
    const sites = await d.listSites();
    expect(sites.map((s) => s.id).sort()).toEqual(['blog-demo', 'business-demo', 'travel-demo']);

    const business = await d.getSite('business-demo');
    expect(business?.name).toBe('Meridian Consulting');
    expect(business?.themeId).toBe('business');
    expect(business?.settings.colors.primary).toMatch(/^#/);
    expect(business?.settings.nav.length).toBeGreaterThan(0);

    expect((await d.getSiteByHost('business.demo.local:3000'))?.id).toBe('business-demo');
    expect((await d.getSiteByHost('www.meridian-consulting.example'))?.id).toBe('business-demo');
    expect(await d.getSiteByHost('unmapped.example.org')).toBeNull();
  });

  it('serves pages and posts scoped to each site', async () => {
    const home = await d.getHomepage('business-demo');
    expect(home?.siteId).toBe('business-demo');
    expect(home?.blocks.length).toBeGreaterThan(0);

    const posts = await d.listPosts('blog-demo');
    expect(posts.length).toBe(6);
    expect(posts.every((p) => p.siteId === 'blog-demo')).toBe(true);
    expect(posts[0].publishedAt >= posts[1].publishedAt).toBe(true); // newest first

    // Isolation: another site's record is a 404-equivalent (null).
    expect(await d.getPost('travel-demo', 'the-attention-economy-is-running-out-of-attention')).toBeNull();
    expect(await d.getPage('travel-demo', 'services')).toBeNull();
  });

  it('filters by category with per-site counts', async () => {
    const tech = await d.listPosts('blog-demo', { categorySlug: 'technology' });
    expect(tech.length).toBe(2);
    expect(await d.listPosts('travel-demo', { categorySlug: 'technology' })).toEqual([]);

    const blogCategories = await d.listCategories('blog-demo');
    const culture = blogCategories.find((c) => c.slug === 'culture');
    expect(culture?.postCount).toBe(2);
  });

  it('never exposes draft content', async () => {
    const draft = await prisma.post.create({
      data: {
        siteId: 'blog-demo',
        slug: 'secret-draft-post',
        title: 'Secret draft',
        excerpt: 'invisible',
        body: ['paragraph'],
        authorId: 'naomi-okafor',
        status: 'DRAFT',
        publishedAt: new Date(),
      },
    });
    expect(await d.getPost('blog-demo', 'secret-draft-post')).toBeNull();
    expect((await d.listPosts('blog-demo')).some((p) => p.slug === 'secret-draft-post')).toBe(false);

    await prisma.post.update({ where: { id: draft.id }, data: { status: 'PUBLISHED' } });
    expect((await d.getPost('blog-demo', 'secret-draft-post'))?.title).toBe('Secret draft');

    await prisma.post.delete({ where: { id: draft.id } });
  });

  it('enforces unique domains and unique slugs per site', async () => {
    await expect(
      prisma.domain.create({ data: { siteId: 'blog-demo', host: 'business.demo.local' } }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await expect(
      prisma.page.create({
        data: { siteId: 'blog-demo', slug: 'about', title: 'Duplicate slug', blocks: [] },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    // Identical slugs on different sites remain allowed.
    const both = await Promise.all([
      d.getPage('business-demo', 'contact'),
      d.getPage('travel-demo', 'contact'),
    ]);
    expect(both.map((p) => p?.siteId)).toEqual(['business-demo', 'travel-demo']);
  });

  it('is idempotent: running the seed twice creates no duplicates', async () => {
    const before = {
      sites: await prisma.site.count(),
      pages: await prisma.page.count(),
      posts: await prisma.post.count(),
      categories: await prisma.category.count(),
      authors: await prisma.author.count(),
      domains: await prisma.domain.count(),
      media: await prisma.media.count(),
    };
    await seedDatabase(prisma); // second run
    const after = {
      sites: await prisma.site.count(),
      pages: await prisma.page.count(),
      posts: await prisma.post.count(),
      categories: await prisma.category.count(),
      authors: await prisma.author.count(),
      domains: await prisma.domain.count(),
      media: await prisma.media.count(),
    };
    expect(after).toEqual(before);
    expect(after.sites).toBe(3);
    expect(after.posts).toBe(13);
  });

  it('persists active theme changes per site without touching others', async () => {
    const originalTravel = (await d.getSite('travel-demo'))!.themeId;
    const originalBusiness = (await d.getSite('business-demo'))!.themeId;

    await d.updateActiveTheme('travel-demo', 'blog');
    expect((await d.getSite('travel-demo'))?.themeId).toBe('blog');
    expect((await d.getSite('business-demo'))?.themeId).toBe(originalBusiness);

    await d.updateActiveTheme('travel-demo', originalTravel);
    expect((await d.getSite('travel-demo'))?.themeId).toBe(originalTravel);
  });

  it('wraps database failures into DataUnavailableError (no raw driver errors)', async () => {
    // Point an adapter at an unreachable server.
    const offline = new PrismaClient({
      datasources: { db: { url: 'postgresql://nouser@127.0.0.1:59999/none?connection_limit=1&connect_timeout=1' } },
    });
    const failing = new PostgresDataAdapter(offline);
    await expect(failing.listSites()).rejects.toMatchObject({ name: 'DataUnavailableError' });
    await offline.$disconnect();
  });
});
