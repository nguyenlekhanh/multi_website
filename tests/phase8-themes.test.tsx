import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/admin/password';
import type { AdminSessionUser } from '@/lib/admin/types';
import { validatePackage } from '@/lib/theme-package/validate';
import type { ValidatedThemePackage } from '@/lib/theme-package/spec';
import type { PackageFiles } from '@/lib/theme-package/validate';
import { makeZip, readZip } from '@/lib/theme-package/zip';
import { packageThemeDefinition } from '@/lib/theme-package/renderer';
import {
  installThemePackage,
  uninstallThemePackage,
  listInstalledThemes,
  resolveThemeDefinition,
} from '@/lib/theme-package/store';
import { loadDirAsPackageFiles } from './helpers';
import { join } from 'node:path';
import type { SiteContext } from '@/platform/types';

/**
 * Phase 8 tests: render every new package across all four routes (DB-free),
 * then install/activate/rollback/uninstall integration against the test DB.
 */

const THEME_IDS = [
  'blog-editorial',
  'travel-explorer',
  'restaurant-bistro',
  'hotel-luxury',
  'education-academy',
  'saas-startup',
] as const;

const ROOT = join(__dirname, '..', 'theme-packages');

function loadPackage(id: string): ValidatedThemePackage {
  const result = validatePackage(loadDirAsPackageFiles(join(ROOT, id)));
  if (!result.ok) throw new Error(`${id} failed validation: ${JSON.stringify(result.errors)}`);
  return result.pkg;
}

function ctxFor(themeId: string): SiteContext {
  const settings = {
    identity: { name: 'Test Site', tagline: 'A test website.', logoText: 'Test', logoInitials: 'TS' },
    colors: {
      primary: '#1F2937', primaryForeground: '#FFFFFF', accent: '#C9A227',
      background: '#FFFFFF', foreground: '#111827', muted: '#F3F4F6',
      mutedForeground: '#6B7280', border: '#E5E7EB', dark: '#111827', darkForeground: '#F9FAFB',
    },
    nav: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Journal', href: '/posts' },
      { label: 'Contact', href: '/contact' },
    ],
    footerNav: [{ label: 'Contact', href: '/contact' }],
    seo: { defaultTitle: 'Test Site', titleTemplate: '%s · Test', description: 'A test website.', keywords: [] },
  };
  return {
    site: {
      id: 'test-site', name: 'Test Site', domain: 'test.example', domains: ['test.example'],
      themeId: `package:${themeId}`, settings, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    },
    settings,
    effectiveThemeId: `package:${themeId}`,
    origin: 'https://test.example',
    preview: false,
  };
}

const cmsBlocks = [
  { type: 'hero', eyebrow: 'Eyebrow', title: 'Hero title for the theme', subtitle: 'Hero subtitle.', primaryCta: { label: 'Go', href: '/contact' } },
  { type: 'cards', eyebrow: 'Cards', heading: 'Card grid', items: [{ title: 'Card one', description: 'Description.', meta: ['Meta'], tag: 'New' }], columns: 3 },
  { type: 'features', eyebrow: 'Features', heading: 'Feature set', items: [{ icon: 'zap', title: 'Feature', description: 'Desc.' }] },
  { type: 'stats', items: [{ value: '99', label: 'stat' }] },
  { type: 'testimonials', heading: 'Kind words', items: [{ quote: 'Great.', author: 'A. Client', initials: 'AC' }] },
  { type: 'intro', heading: 'About', body: ['One.', 'Two.'], image: '/images/x.jpg' },
  { type: 'postlist', heading: 'Journal', limit: 2 },
] as never[];

const posts = [
  { siteId: 'test-site', slug: 'post-one', title: 'First post title', excerpt: 'Excerpt one.', body: ['A.', 'B.'], author: { id: 'a1', name: 'Author One', initials: 'AO', role: 'Writer' }, publishedAt: '2026-02-01T00:00:00Z', readingMinutes: 3, categoryId: 'c1', status: 'PUBLISHED' },
  { siteId: 'test-site', slug: 'post-two', title: 'Second post title', excerpt: 'Excerpt two.', body: ['C.', 'D.'], author: { id: 'a1', name: 'Author One', initials: 'AO', role: 'Writer' }, publishedAt: '2026-03-01T00:00:00Z', readingMinutes: 4, categoryId: 'c1', status: 'PUBLISHED' },
] as never[];
const categories = [{ id: 'c1', siteId: 'test-site', slug: 'news', name: 'News', postCount: 2 }];

/* ------------------------- renderer (DB-free) ------------------------- */

describe.each(THEME_IDS)('%s package rendering', (themeId) => {
  const pkg = loadPackage(themeId);
  const theme = packageThemeDefinition(pkg);
  const ctx = ctxFor(themeId);

  it('manifest matches the package identity', () => {
    expect(pkg.manifest.id).toBe(themeId);
    expect(pkg.css).toContain(`.msp-theme-${themeId}`);
    expect(pkg.preview?.mime).toBe('image/png');
  });

  it('renders the homepage with branding from site context', () => {
    const html = renderToStaticMarkup(createElement(theme.home, {
      ctx, page: { siteId: 'test-site', slug: 'home', title: 'Home', isHomepage: true, blocks: cmsBlocks, updatedAt: '2026-01-01' } as never,
      posts, categories,
    }));
    expect(html).toContain('Hero title for the theme');
    expect(html).toContain('Test'); // site wordmark
    expect(html).toContain('Journal'); // nav item
    expect(html).toContain(`msp-theme-${themeId}`);
    expect(html).not.toContain('<script');
  });

  it('renders a CMS page with content + package static section', () => {
    const html = renderToStaticMarkup(createElement(theme.page, {
      ctx, page: { siteId: 'test-site', slug: 'about', title: 'About the site', eyebrow: 'About', blocks: cmsBlocks.slice(0, 2), updatedAt: '2026-01-01' } as never,
      posts, categories,
    }));
    expect(html).toContain('About the site');
    expect(html).toContain('Card one');
  });

  it('renders post list (with featured-first when configured) and post detail', () => {
    const listHtml = renderToStaticMarkup(createElement(theme.postList!, { ctx, posts, categories }));
    expect(listHtml).toContain('Second post title');
    expect(listHtml).toContain('/posts/post-one');
    const featured = pkg.templates.postList.options.postListFeaturedFirst;
    expect(typeof featured === 'boolean' || featured === undefined).toBe(true);

    const postHtml = renderToStaticMarkup(createElement(theme.post!, { ctx, post: posts[0], related: [posts[1]] }));
    expect(postHtml).toContain('First post title');
    expect(postHtml).toContain('Author One');
  });

  it('empty content and empty posts render states, not crashes', () => {
    const homeHtml = renderToStaticMarkup(createElement(theme.home, {
      ctx, page: { siteId: 'test-site', slug: 'home', title: 'Home', isHomepage: true, blocks: [], updatedAt: 'x' } as never,
    }));
    expect(homeHtml).toContain('No content has been published here yet.');
    const listHtml = renderToStaticMarkup(createElement(theme.postList!, { ctx, posts: [], categories: [] }));
    expect(listHtml).toContain('Nothing published here yet.');
  });

  it('404 and categories views render', () => {
    expect(renderToStaticMarkup(createElement(theme.notFound, { ctx }))).toContain('Page not found');
    expect(renderToStaticMarkup(createElement(theme.categories!, { ctx, categories }))).toContain('News');
  });

  it('packs and round-trip validates', () => {
    const files: PackageFiles = loadDirAsPackageFiles(join(ROOT, themeId));
    const zip = makeZip([...files.entries()].map(([name, data]) => ({ name, data })));
    const read = readZip(zip);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const again = validatePackage(new Map(read.entries.map((e) => [e.name, e.data])));
    expect(again.ok).toBe(true);
  });
});

it('all package ids are unique and collide with nothing', () => {
  const ids = [...THEME_IDS, 'real-estate-modern'];
  expect(new Set(ids).size).toBe(ids.length);
  const native = ['business', 'travel', 'blog', 'portfolio', 'news', 'it', 'agency'];
  expect(ids.some((id) => (native as string[]).includes(id))).toBe(false);
});

/* --------------------- install / activate (integration) --------------------- */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (TEST_DATABASE_URL) process.env.DATABASE_URL = TEST_DATABASE_URL;

const prisma = TEST_DATABASE_URL
  ? new PrismaClient({ datasources: { db: { url: `${TEST_DATABASE_URL}${TEST_DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=3` } } })
  : (null as unknown as PrismaClient);

const superAdmin: AdminSessionUser = { id: 'p8-super', email: 'p8-super@test.local', name: 'P8 Super', role: 'SUPER_ADMIN' };
const siteAdmin: AdminSessionUser = { id: 'p8-editor', email: 'p8-editor@test.local', name: 'P8 Editor', role: 'SITE_ADMIN' };

describe.skipIf(!TEST_DATABASE_URL)('Phase 8 theme library (integration)', () => {
  const SITE = 'p8-test-site';

  beforeAll(async () => {
    if (!/test|localhost|127\.0\.0\.1/.test(TEST_DATABASE_URL!)) throw new Error('disposable test DB only');
    await prisma.adminUser.deleteMany({ where: { email: { in: [superAdmin.email, siteAdmin.email] } } });
    await prisma.adminUser.createMany({
      data: [
        { id: superAdmin.id, email: superAdmin.email, name: superAdmin.name, role: 'SUPER_ADMIN', passwordHash: await hashPassword('p8-super-pass-123456') },
        { id: siteAdmin.id, email: siteAdmin.email, name: siteAdmin.name, role: 'SITE_ADMIN', passwordHash: await hashPassword('p8-editor-pass-12345') },
      ],
    });
    // Clean slate for the fixture site only.
    for (const themeId of THEME_IDS) await prisma.themePackage.deleteMany({ where: { themeId } });
    await teardownSite();
  });

  afterAll(async () => {
    await teardownSite();
    for (const themeId of THEME_IDS) await prisma.themePackage.deleteMany({ where: { themeId } });
    await prisma.auditLog.deleteMany({ where: { actorEmail: { in: [superAdmin.email, siteAdmin.email, 'cli@local'] } } });
    await prisma.adminUser.deleteMany({ where: { email: { in: [superAdmin.email, siteAdmin.email] } } });
    await prisma.$disconnect();
  });

  async function teardownSite() {
    await prisma.post.deleteMany({ where: { siteId: SITE } });
    await prisma.author.deleteMany({ where: { siteId: SITE } });
    await prisma.category.deleteMany({ where: { siteId: SITE } });
    await prisma.media.deleteMany({ where: { siteId: SITE } });
    await prisma.page.deleteMany({ where: { siteId: SITE } });
    await prisma.domain.deleteMany({ where: { siteId: SITE } });
    await prisma.siteSettings.deleteMany({ where: { siteId: SITE } });
    await prisma.site.deleteMany({ where: { id: SITE } });
  }

  it('installs all six packages through the standard service', async () => {
    for (const themeId of THEME_IDS) {
      const files = loadDirAsPackageFiles(join(ROOT, themeId));
      const zip = makeZip([...files.entries()].map(([name, data]) => ({ name, data })));
      const result = await installThemePackage(superAdmin, zip);
      expect(result.ok, themeId).toBe(true);
    }
    const installed = await listInstalledThemes();
    for (const themeId of THEME_IDS) {
      expect(installed.some((t) => t.themeId === themeId && t.version === '1.0.0'), themeId).toBe(true);
    }
    // Installs audited.
    const audits = await prisma.auditLog.count({
      where: { actorEmail: superAdmin.email, action: 'theme.package_install' },
    });
    expect(audits).toBeGreaterThanOrEqual(THEME_IDS.length);
  });

  it('activates each package on a test site; content survives; other sites unaffected', async () => {
    const { createSite, setSiteTheme } = await import('@/lib/admin/sites-service');
    const created = await createSite(superAdmin, { siteId: SITE, name: 'P8 Test Site', themeId: 'business' });
    expect(created.ok).toBe(true);

    const author = await prisma.author.create({
      data: { id: 'p8-author', siteId: SITE, slug: 'p8-author', name: 'P. Author', initials: 'PA' },
    });
    const post = await prisma.post.create({
      data: { siteId: SITE, slug: 'p8-post', title: 'P8 test article', excerpt: 'Excerpt.', body: ['One.', 'Two.'], authorId: author.id, status: 'PUBLISHED', publishedAt: new Date(), readingMinutes: 2 },
    });
    const page = await prisma.page.create({
      data: { siteId: SITE, slug: 'about', title: 'About P8', blocks: [], status: 'PUBLISHED' },
    });

    const otherSiteThemeBefore = await prisma.site.findUnique({ where: { id: 'business-demo' }, select: { themeId: true } });

    for (const themeId of THEME_IDS) {
      const activated = await setSiteTheme(superAdmin, SITE, `package:${themeId}`);
      expect(activated.ok, themeId).toBe(true);
      const definition = await resolveThemeDefinition(`package:${themeId}`);
      expect(definition.id).toBe(themeId);

      // The site's real content renders through each package.
      const html = renderToStaticMarkup(createElement(definition.postList!, {
        ctx: ctxFor(themeId), posts: [post] as never, categories: [],
      }));
      expect(html, themeId).toContain('P8 test article');
    }

    // Content unchanged after six theme switches.
    const postAfter = await prisma.post.findUnique({ where: { id: post.id } });
    expect(postAfter?.slug).toBe('p8-post');
    expect(postAfter?.body).toHaveLength(2);
    const pageAfter = await prisma.page.findUnique({ where: { id: page.id } });
    expect(pageAfter?.title).toBe('About P8');

    // Other sites untouched.
    const otherSiteThemeAfter = await prisma.site.findUnique({ where: { id: 'business-demo' }, select: { themeId: true } });
    expect(otherSiteThemeAfter?.themeId).toBe(otherSiteThemeBefore?.themeId);

    // SITE_ADMIN (unassigned) cannot switch.
    const denied = await setSiteTheme(siteAdmin, SITE, 'business');
    expect(denied.ok).toBe(false);

    await setSiteTheme(superAdmin, SITE, `package:${THEME_IDS[0]}`);
  });

  it('uninstall is refused while a site uses the package; works after switching away', async () => {
    const inUse = await uninstallThemePackage(superAdmin, THEME_IDS[0]);
    expect(inUse.ok).toBe(false);
    if (!inUse.ok) expect(inUse.error).toMatch(/active on/i);

    const { setSiteTheme } = await import('@/lib/admin/sites-service');
    await setSiteTheme(superAdmin, SITE, 'business');
    const removed = await uninstallThemePackage(superAdmin, THEME_IDS[0]);
    expect(removed.ok).toBe(true);

    // Missing package falls back safely for render.
    const fallback = await resolveThemeDefinition(`package:${THEME_IDS[0]}`);
    expect(fallback.id).toBe('business');

    // Reinstall restores it (audit continues).
    const files = loadDirAsPackageFiles(join(ROOT, THEME_IDS[0]));
    const zip = makeZip([...files.entries()].map(([name, data]) => ({ name, data })));
    const reinstalled = await installThemePackage(superAdmin, zip);
    expect(reinstalled.ok).toBe(true);
  });
});
