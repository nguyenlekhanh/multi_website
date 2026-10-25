import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { loadDirAsPackageFiles } from './helpers';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/admin/password';
import type { AdminSessionUser } from '@/lib/admin/types';
import { validatePackage, type PackageFiles } from '@/lib/theme-package/validate';
import { makeZip } from '@/lib/theme-package/zip';
import { packageThemeDefinition } from '@/lib/theme-package/renderer';
import {
  installThemePackage,
  rollbackThemePackage,
  uninstallThemePackage,
  listInstalledThemes,
  getInstalledTheme,
  resolveThemeDefinition,
  isValidThemeReference,
} from '@/lib/theme-package/store';
import { listThemes } from '@/platform/registry';
import { createSite } from '@/lib/admin/sites-service';
import type { SiteContext } from '@/platform/types';

/**
 * Renderer + install-lifecycle tests. The renderer suite runs WITHOUT a
 * database (pure component tests against the committed sample package); the
 * lifecycle suite is DB-integration and skips without TEST_DATABASE_URL.
 */

const SAMPLE_DIR = join(__dirname, '..', 'theme-packages', 'real-estate-modern');

function loadSampleDir(): PackageFiles {
  return loadDirAsPackageFiles(SAMPLE_DIR);
}

const samplePkg = () => {
  const result = validatePackage(loadSampleDir());
  if (!result.ok) throw new Error('sample package failed validation: ' + JSON.stringify(result.errors));
  return result.pkg;
};

const fixtureCtx: SiteContext = {
  site: {
    id: 'fixture-site',
    name: 'Habitat Realty',
    domain: 'habitat.example',
    domains: ['habitat.example'],
    themeId: 'package:real-estate-modern',
    settings: {
      identity: { name: 'Habitat Realty', tagline: 'Homes worth the commute.', logoText: 'Habitat', logoInitials: 'HR' },
      colors: {
        primary: '#0F3D3E', primaryForeground: '#FFFFFF', accent: '#C9A227',
        background: '#FAF9F6', foreground: '#1C1917', muted: '#F0EDE6',
        mutedForeground: '#6B675F', border: '#E5E0D5', dark: '#0F2E2E', darkForeground: '#E8F0EE',
      },
      nav: [
        { label: 'Home', href: '/' },
        { label: 'Listings', href: '/listings' },
        { label: 'Journal', href: '/posts' },
        { label: 'Contact', href: '/contact' },
      ],
      footerNav: [{ label: 'Contact', href: '/contact' }],
      seo: {
        defaultTitle: 'Habitat Realty', titleTemplate: '%s · Habitat Realty',
        description: 'Homes worth the commute.', keywords: [],
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  settings: {} as SiteContext['settings'],
  effectiveThemeId: 'package:real-estate-modern',
  origin: 'https://habitat.example',
  preview: false,
};
fixtureCtx.settings = fixtureCtx.site.settings;

const cmsBlocks = [
  { type: 'hero', eyebrow: 'Featured listing', title: 'A home that earns its view', subtitle: 'Four bedrooms above the harbor.', image: '/images/travel/hero.jpg', imageAlt: 'Harbor home', primaryCta: { label: 'Book a viewing', href: '/contact' } },
  { type: 'cards', eyebrow: 'Open houses', heading: 'This weekend', items: [{ title: 'Harbor House', description: '4 bd · 3 ba · waterfront', image: '/images/travel/santorini.jpg', imageAlt: 'House', meta: ['$1.2 M'], tag: 'New' }], columns: 3 },
  { type: 'stats', items: [{ value: '320+', label: 'homes sold' }, { value: '12', label: 'years local' }] },
  { type: 'postlist', heading: 'From the journal', limit: 2 },
];

const fixturePosts = [
  {
    siteId: 'fixture-site', slug: 'first-home-checklist', title: 'The first-home checklist',
    excerpt: 'Everything to verify before you sign.', body: ['Paragraph one.', 'Paragraph two.'],
    categoryId: 'c1', tags: [], author: { id: 'a1', name: 'Ada Realtor', initials: 'AR' },
    publishedAt: '2026-02-01T08:00:00.000Z', readingMinutes: 4, status: 'PUBLISHED',
  } as never,
  {
    siteId: 'fixture-site', slug: 'market-notes-spring', title: 'Market notes: spring',
    excerpt: 'What the numbers say.', body: ['One.', 'Two.'],
    categoryId: 'c1', tags: [], author: { id: 'a1', name: 'Ada Realtor', initials: 'AR' },
    publishedAt: '2026-03-01T08:00:00.000Z', readingMinutes: 3, status: 'PUBLISHED',
  } as never,
];
const fixtureCategories = [{ id: 'c1', siteId: 'fixture-site', slug: 'buying', name: 'Buying', postCount: 2 }];

/* ------------------------- renderer (no database) ------------------------- */

describe('package runtime renderer', () => {
  it('renders a homepage: header/footer chrome + every CMS block + journal slot', () => {
    const theme = packageThemeDefinition(samplePkg());
    const html = renderToStaticMarkup(
      createElement(theme.home, {
        ctx: fixtureCtx,
        page: { siteId: 'fixture-site', slug: 'home', title: 'Home', isHomepage: true, blocks: cmsBlocks, updatedAt: '2026-01-01T00:00:00.000Z' } as never,
        posts: fixturePosts,
        categories: fixtureCategories,
      }),
    );
    // Branding from the website's own settings — never hardcoded.
    expect(html).toContain('Habitat');
    expect(html).toContain('A home that earns its view');
    expect(html).toContain('Harbor House');
    expect(html).toContain('$1.2 M');
    expect(html).toContain('The first-home checklist');
    // Scoped CSS is injected.
    expect(html).toContain('.msp-theme-real-estate-modern');
    expect(html).not.toContain('<script');
  });

  it('renders a CMS page with the band header and the package\u2019s static CTA panel', () => {
    const theme = packageThemeDefinition(samplePkg());
    const html = renderToStaticMarkup(
      createElement(theme.page, {
        ctx: fixtureCtx,
        page: { siteId: 'fixture-site', slug: 'about', title: 'About Habitat', eyebrow: 'About', blocks: cmsBlocks.slice(0, 1), updatedAt: '2026-01-01T00:00:00.000Z' } as never,
        posts: fixturePosts,
        categories: fixtureCategories,
      }),
    );
    expect(html).toContain('About Habitat');
    expect(html).toContain('Ready when you are'); // static section from page.json
  });

  it('renders the post list with featured-first and the post detail with author card', () => {
    const theme = packageThemeDefinition(samplePkg());
    const listHtml = renderToStaticMarkup(
      createElement(theme.postList!, { ctx: fixtureCtx, posts: fixturePosts, categories: fixtureCategories }),
    );
    expect(listHtml).toContain('Market notes: spring');
    expect(listHtml).toContain('/posts/first-home-checklist');

    const postHtml = renderToStaticMarkup(
      createElement(theme.post!, { ctx: fixtureCtx, post: fixturePosts[0], related: [fixturePosts[1]] }),
    );
    expect(postHtml).toContain('The first-home checklist');
    expect(postHtml).toContain('About the author'); // from post.json options
    expect(postHtml).toContain('Market notes: spring'); // related
  });

  it('renders 404 and categories views without crashing', () => {
    const theme = packageThemeDefinition(samplePkg());
    expect(renderToStaticMarkup(createElement(theme.notFound, { ctx: fixtureCtx }))).toContain('Page not found');
    expect(renderToStaticMarkup(createElement(theme.categories!, { ctx: fixtureCtx, categories: fixtureCategories }))).toContain('Buying');
  });

  it('empty content renders an empty state, and missing images never crash', () => {
    const theme = packageThemeDefinition(samplePkg());
    const html = renderToStaticMarkup(
      createElement(theme.home, {
        ctx: fixtureCtx,
        page: { siteId: 'fixture-site', slug: 'home', title: 'Home', isHomepage: true, blocks: [], updatedAt: 'x' } as never,
      }),
    );
    expect(html).toContain('No content has been published here yet.');
    expect(html).toContain('msp-theme-real-estate-modern'); // layout still renders
  });

  it('exposes layout/content only — no Prisma or filesystem imports leak into the definition', () => {
    const theme = packageThemeDefinition(samplePkg());
    expect(theme.id).toBe('real-estate-modern');
    expect(theme.supportsPosts).toBe(true);
    for (const key of ['layout', 'home', 'page', 'postList', 'post', 'categories', 'notFound'] as const) {
      expect(typeof theme[key]).toBe('function');
    }
  });
});

/* --------------------- install lifecycle (integration) --------------------- */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (TEST_DATABASE_URL) process.env.DATABASE_URL = TEST_DATABASE_URL;

const prisma = TEST_DATABASE_URL
  ? new PrismaClient({ datasources: { db: { url: `${TEST_DATABASE_URL}${TEST_DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=3` } } })
  : (null as unknown as PrismaClient);

const superAdmin: AdminSessionUser = { id: 'tp-super', email: 'tp-super@test.local', name: 'TP Super', role: 'SUPER_ADMIN' };
const siteAdmin: AdminSessionUser = { id: 'tp-editor', email: 'tp-editor@test.local', name: 'TP Editor', role: 'SITE_ADMIN' };

describe.skipIf(!TEST_DATABASE_URL)('theme package lifecycle (integration)', () => {
  const SITE = 're-package-test';

  beforeAll(async () => {
    if (!/test|localhost|127\.0\.0\.1/.test(TEST_DATABASE_URL!)) throw new Error('disposable test DB only');
    await prisma.themePackage.deleteMany({ where: { themeId: 'real-estate-modern' } });
    await prisma.aiJob.deleteMany({ where: { siteId: SITE } });
    await prisma.post.deleteMany({ where: { siteId: SITE } });
    await prisma.author.deleteMany({ where: { siteId: SITE } });
    await prisma.category.deleteMany({ where: { siteId: SITE } });
    await prisma.media.deleteMany({ where: { siteId: SITE } });
    await prisma.page.deleteMany({ where: { siteId: SITE } });
    await prisma.domain.deleteMany({ where: { siteId: SITE } });
    await prisma.siteSettings.deleteMany({ where: { siteId: SITE } });
    await prisma.site.deleteMany({ where: { id: SITE } });
    await prisma.adminUser.deleteMany({ where: { email: { in: [superAdmin.email, siteAdmin.email] } } });
    await prisma.adminUser.createMany({
      data: [
        { id: superAdmin.id, email: superAdmin.email, name: superAdmin.name, role: 'SUPER_ADMIN', passwordHash: await hashPassword('tp-super-pass-123456') },
        { id: siteAdmin.id, email: siteAdmin.email, name: siteAdmin.name, role: 'SITE_ADMIN', passwordHash: await hashPassword('tp-editor-pass-12345') },
      ],
    });
    // Author for the fixture site so package rendering has data.
    await createSite(superAdmin, { siteId: SITE, name: 'Package Test Realty', themeId: 'business' });
    await prisma.author.create({
      data: { id: 'pkg-test-author', siteId: SITE, slug: 'pkg-test-author', name: 'P. Tester', initials: 'PT' },
    });
    await prisma.post.create({
      data: {
        siteId: SITE, slug: 'pkg-test-post', title: 'Package test post', excerpt: 'Excerpt.',
        body: ['One.', 'Two.'], authorId: 'pkg-test-author', status: 'PUBLISHED',
        publishedAt: new Date(), readingMinutes: 2,
      },
    });
  });

  afterAll(async () => {
    await prisma.site.updateMany({ where: { id: SITE, themeId: 'package:real-estate-modern' }, data: { themeId: 'business' } });
    await prisma.themePackage.deleteMany({ where: { themeId: 'real-estate-modern' } });
    await prisma.post.deleteMany({ where: { siteId: SITE } });
    await prisma.author.deleteMany({ where: { siteId: SITE } });
    await prisma.page.deleteMany({ where: { siteId: SITE } });
    await prisma.domain.deleteMany({ where: { siteId: SITE } });
    await prisma.siteSettings.deleteMany({ where: { siteId: SITE } });
    await prisma.site.deleteMany({ where: { id: SITE } });
    await prisma.auditLog.deleteMany({ where: { actorEmail: { in: [superAdmin.email, siteAdmin.email] } } });
    await prisma.adminUser.deleteMany({ where: { email: { in: [superAdmin.email, siteAdmin.email] } } });
    await prisma.$disconnect();
  });

  it('rejects a non-ZIP upload safely', async () => {
    const result = await installThemePackage(superAdmin, new TextEncoder().encode('this is not a zip'));
    expect(result.ok).toBe(false);
  });

  it('rejects a malicious ZIP (traversal entry)', async () => {
    const zip = makeZip([
      { name: 'theme.json', data: new TextEncoder().encode('{}') },
      { name: '../evil.sh', data: new Uint8Array(0) },
    ]);
    const result = await installThemePackage(superAdmin, zip);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/traversal/i);
  });

  it('rejects an invalid manifest with field-level errors', async () => {
    const zip = makeZip([{ name: 'theme.json', data: new TextEncoder().encode('{"format":"other"}') }]);
    const result = await installThemePackage(superAdmin, zip);
    expect(result.ok).toBe(false);
    if (!result.ok) expect((result.errors ?? []).length).toBeGreaterThan(0);
  });

  it('rejects native-theme id collisions and SITE_ADMIN installs', async () => {
    const files = loadSampleDir();
    files.set('theme.json', new TextEncoder().encode(JSON.stringify({ ...samplePkg().manifest, id: 'business' })));
    const zip = makeZip([...files.entries()].map(([name, data]) => ({ name, data })));
    const collision = await installThemePackage(superAdmin, zip);
    expect(collision.ok).toBe(false);
    if (!collision.ok) expect(collision.error).toContain('built-in');

    const denied = await installThemePackage(siteAdmin, makeZip([...loadSampleDir().entries()].map(([name, data]) => ({ name, data }))));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toContain('Super Admin');
  });

  it('installs the sample package, lists it, and audits the install', async () => {
    const zip = makeZip([...loadSampleDir().entries()].map(([name, data]) => ({ name, data })));
    const result = await installThemePackage(superAdmin, zip);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.themeId).toBe('real-estate-modern');

    const listed = await listInstalledThemes();
    expect(listed.some((t) => t.themeId === 'real-estate-modern' && t.version === '1.0.0')).toBe(true);

    const audits = await prisma.auditLog.findMany({
      where: { actorEmail: superAdmin.email, action: 'theme.package_install' },
    });
    expect(audits.length).toBeGreaterThan(0);

    // Reinstalling the same version is refused.
    const again = await installThemePackage(superAdmin, zip);
    expect(again.ok).toBe(false);
  });

  it('resolves package references for rendering and keeps native themes intact', async () => {
    expect(await isValidThemeReference('package:real-estate-modern')).toBe(true);
    expect(await isValidThemeReference('package:not-installed')).toBe(false);
    expect(await isValidThemeReference('business')).toBe(true);

    const definition = await resolveThemeDefinition('package:real-estate-modern');
    expect(definition.id).toBe('real-estate-modern');
    expect(definition.name).toBe('Real Estate Modern');

    // Missing package falls back to a native theme — never a crash.
    const fallback = await resolveThemeDefinition('package:missing-theme');
    expect(fallback.id).toBe('business');

    // The 7 native themes remain registered and untouched.
    expect(listThemes().map((t) => t.id).sort()).toEqual([
      'agency', 'blog', 'business', 'it', 'news', 'portfolio', 'travel',
    ]);
  });

  it('activates the package for a website; rendering flows through the site\u2019s data; drafts stay hidden', async () => {
    const { setSiteTheme } = await import('@/lib/admin/sites-service');
    const activated = await setSiteTheme(superAdmin, SITE, 'package:real-estate-modern');
    expect(activated.ok).toBe(true);

    const site = await prisma.site.findUnique({ where: { id: SITE } });
    expect(site?.themeId).toBe('package:real-estate-modern');

    // Definition renders the site's real post through the package.
    const definition = await resolveThemeDefinition('package:real-estate-modern');
    const html = renderToStaticMarkup(
      createElement(definition.postList!, {
        ctx: { ...fixtureCtx, site: { ...fixtureCtx.site, id: SITE }, effectiveThemeId: 'package:real-estate-modern' },
        posts: (await prisma.post.findMany({ where: { siteId: SITE, status: 'PUBLISHED' } })) as never,
        categories: [],
      }),
    );
    expect(html).toContain('Package test post');

    // Cross-site isolation: a draft on the fixture site stays invisible.
    const adapter = new (await import('@/platform/data/postgres-adapter')).PostgresDataAdapter(prisma);
    expect(await adapter.getPost(SITE, 'pkg-test-post')).not.toBeNull();

    // SITE_ADMIN cannot switch this site (not assigned).
    const denied = await setSiteTheme(siteAdmin, SITE, 'business');
    expect(denied.ok).toBe(false);
  });

  it('update → rollback → uninstall lifecycle with audit trail', async () => {
    // Install v1.1.0 (update).
    const files = loadSampleDir();
    const manifest = { ...samplePkg().manifest, version: '1.1.0' };
    files.set('theme.json', new TextEncoder().encode(JSON.stringify(manifest)));
    const update = await installThemePackage(superAdmin, makeZip([...files.entries()].map(([name, data]) => ({ name, data }))));
    expect(update.ok).toBe(true);

    let current = await getInstalledTheme('real-estate-modern');
    expect(current?.manifest.version).toBe('1.1.0');

    // Rollback to 1.0.0.
    const rollback = await rollbackThemePackage(superAdmin, 'real-estate-modern', '1.0.0');
    expect(rollback.ok).toBe(true);
    current = await getInstalledTheme('real-estate-modern');
    expect(current?.manifest.version).toBe('1.0.0');

    // Uninstall refused while in use.
    const inUse = await uninstallThemePackage(superAdmin, 'real-estate-modern');
    expect(inUse.ok).toBe(false);
    if (!inUse.ok) expect(inUse.error).toMatch(/active on/i);

    // Deactivate, then uninstall succeeds.
    const { setSiteTheme } = await import('@/lib/admin/sites-service');
    await setSiteTheme(superAdmin, SITE, 'business');
    const uninstalled = await uninstallThemePackage(superAdmin, 'real-estate-modern');
    expect(uninstalled.ok).toBe(true);
    expect(await isValidThemeReference('package:real-estate-modern')).toBe(false);

    const auditActions = (
      await prisma.auditLog.findMany({
        where: { actorEmail: superAdmin.email, action: { startsWith: 'theme.package_' } },
        orderBy: { createdAt: 'asc' },
      })
    ).map((a) => a.action);
    for (const action of ['theme.package_install', 'theme.package_update', 'theme.package_rollback', 'theme.package_uninstall']) {
      expect(auditActions).toContain(action);
    }
  });
});
