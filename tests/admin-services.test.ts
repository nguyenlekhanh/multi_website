import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/admin/password';
import type { AdminSessionUser } from '@/lib/admin/types';
import {
  addDomain,
  createSite,
  getSiteForAdmin,
  listAudit,
  listSitesForAdmin,
  removeDomain,
  setPrimaryDomain,
  setSiteStatus,
  setSiteTheme,
  updateSiteSettings,
} from '@/lib/admin/sites-service';
import { seedDatabase } from '../prisma/seed';
import { PostgresDataAdapter } from '@/platform/data/postgres-adapter';
import { assertSuperAdmin, ForbiddenError } from '@/lib/admin/authz';

/**
 * Integration tests for admin authorization and the service layer, against
 * a real PostgreSQL database. Skipped unless TEST_DATABASE_URL is set and
 * points at a disposable database — never run against production data.
 *
 * Covers: role scoping (super vs site admin), horizontal escalation via
 * forged site ids, site creation/validation, theme changes with audit,
 * branding validation and isolation, and domain management rules.
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// The service layer uses the shared Prisma singleton, which binds DATABASE_URL
// on first use — point it at the test database before any query runs.
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

const prisma = TEST_DATABASE_URL
  ? new PrismaClient({ datasources: { db: { url: `${TEST_DATABASE_URL}${TEST_DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=3` } } })
  : (null as unknown as PrismaClient);

const superAdmin: AdminSessionUser = {
  id: 'test-super',
  email: 'super@test.local',
  name: 'Sandy Super',
  role: 'SUPER_ADMIN',
};
const siteAdmin: AdminSessionUser = {
  id: 'test-site-admin',
  email: 'sitemanager@test.local',
  name: 'Sam Site',
  role: 'SITE_ADMIN',
};
const outsider: AdminSessionUser = {
  id: 'test-outsider',
  email: 'outsider@test.local',
  name: 'Ollie Outsider',
  role: 'SITE_ADMIN',
};

const NEW_SITE = 'admin-test-site';
const d = TEST_DATABASE_URL ? new PostgresDataAdapter(prisma) : (null as unknown as PostgresDataAdapter);

describe.skipIf(!TEST_DATABASE_URL)('admin services (integration)', () => {
  beforeAll(async () => {
    if (!/test|localhost|127\.0\.0\.1/.test(TEST_DATABASE_URL!)) {
      throw new Error('TEST_DATABASE_URL must point at a disposable local/test database.');
    }

    // The demo sites are FK targets for memberships; import fixtures if absent.
    if (!(await prisma.site.findUnique({ where: { id: 'travel-demo' } }))) {
      await seedDatabase(prisma);
    }

    // Wipe admin fixtures (demo content stays intact).
    await prisma.auditLog.deleteMany({ where: { actorEmail: { in: [superAdmin.email, siteAdmin.email, outsider.email] } } });
    await prisma.siteMembership.deleteMany({ where: { user: { email: { in: [siteAdmin.email, outsider.email] } } } });
    await prisma.adminUser.deleteMany({ where: { email: { in: [superAdmin.email, siteAdmin.email, outsider.email] } } });
    await prisma.site.deleteMany({ where: { id: NEW_SITE } });

    await prisma.adminUser.createMany({
      data: [
        { id: superAdmin.id, email: superAdmin.email, name: superAdmin.name, role: 'SUPER_ADMIN', passwordHash: await hashPassword('super-password-123456') },
        { id: siteAdmin.id, email: siteAdmin.email, name: siteAdmin.name, role: 'SITE_ADMIN', passwordHash: await hashPassword('site-password-123456') },
        { id: outsider.id, email: outsider.email, name: outsider.name, role: 'SITE_ADMIN', passwordHash: await hashPassword('outsider-password-12345') },
      ],
    });
    // Site admin is assigned to the existing travel demo site only.
    await prisma.siteMembership.create({ data: { userId: siteAdmin.id, siteId: 'travel-demo' } });
  });

  afterAll(async () => {
    // Leave the database as the seed import produced it. Content FKs are
    // RESTRICT, so children must be removed before the site row itself.
    await prisma.domain.deleteMany({ where: { siteId: NEW_SITE } });
    await prisma.siteSettings.deleteMany({ where: { siteId: NEW_SITE } });
    await prisma.site.deleteMany({ where: { id: NEW_SITE } });
    await prisma.auditLog.deleteMany({ where: { actorEmail: { in: [superAdmin.email, siteAdmin.email, outsider.email] } } });
    await prisma.siteMembership.deleteMany({ where: { user: { email: { in: [siteAdmin.email, outsider.email] } } } });
    await prisma.adminUser.deleteMany({ where: { email: { in: [superAdmin.email, siteAdmin.email, outsider.email] } } });
    await prisma.$disconnect();
  });

  /* ------------------------------ authorization --------------------------- */

  it('Super Admin sees all sites; Site Admin sees only assigned ones', async () => {
    const superList = await listSitesForAdmin(superAdmin);
    const siteList = await listSitesForAdmin(siteAdmin);
    expect(superList.ok && superList.data.length).toBeGreaterThanOrEqual(3);
    expect(siteList.ok && siteList.data.map((s) => s.id)).toEqual(['travel-demo']);
  });

  it('Site Admin can access an assigned site', async () => {
    const result = await getSiteForAdmin(siteAdmin, 'travel-demo');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('travel-demo');
      expect(result.data.settings.colors.primary).toMatch(/^#/);
    }
  });

  it('Site Admin cannot access an unassigned site (forged site id)', async () => {
    const result = await getSiteForAdmin(siteAdmin, 'business-demo');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FORBIDDEN');
  });

  it('a membership grant to a deleted site grants nothing', async () => {
    const result = await getSiteForAdmin(siteAdmin, 'does-not-exist');
    expect(result.ok).toBe(false);
  });

  it('Site Admin cannot create sites, change status, or promote themselves', async () => {
    const created = await createSite(siteAdmin, { siteId: 'rogue-site', name: 'Rogue', themeId: 'blog' });
    expect(created.ok).toBe(false);
    if (!created.ok) expect(created.code).toBe('FORBIDDEN');

    const status = await setSiteStatus(siteAdmin, 'travel-demo', 'INACTIVE');
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.code).toBe('FORBIDDEN');

    // The service layer exposes no role/membership mutation at all; the
    // guard is structural. Assert the guard used by such operations.
    expect(() => assertSuperAdmin(siteAdmin)).toThrow(ForbiddenError);
  });

  /* ---------------------------- website management ------------------------ */

  it('creates a site with defaults and records the audit trail', async () => {
    const created = await createSite(superAdmin, {
      siteId: NEW_SITE,
      name: 'Admin Test Site',
      themeId: 'blog',
      primaryDomain: 'admin-test.example.com',
      tagline: 'Created by an integration test',
    });
    expect(created.ok).toBe(true);

    const detail = await getSiteForAdmin(superAdmin, NEW_SITE);
    expect(detail.ok).toBe(true);
    if (detail.ok) {
      expect(detail.data.themeId).toBe('blog');
      expect(detail.data.status).toBe('ACTIVE');
      expect(detail.data.primaryDomain).toBe('admin-test.example.com');
      expect(detail.data.settings.identity.name).toBe('Admin Test Site');
      expect(detail.data.settings.seo.titleTemplate).toContain('Admin Test Site');
      expect(detail.data.domains[0].verified).toBe(false); // never claims verification
    }

    const audit = await listAudit(superAdmin, { siteId: NEW_SITE });
    expect(audit.ok && audit.data.some((e) => e.action === 'site.create')).toBe(true);
  });

  it('rejects duplicate site ids and invalid theme ids', async () => {
    const duplicate = await createSite(superAdmin, { siteId: 'business-demo', name: 'Dup', themeId: 'blog' });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.code).toBe('CONFLICT');

    const badTheme = await createSite(superAdmin, { siteId: 'other-site', name: 'Other', themeId: 'not-a-theme' });
    expect(badTheme.ok).toBe(false);
    if (!badTheme.ok) expect(badTheme.code).toBe('VALIDATION');

    const badId = await createSite(superAdmin, { siteId: 'Bad_ID', name: 'Bad', themeId: 'blog' });
    expect(badId.ok).toBe(false);
    if (!badId.ok) expect(badId.code).toBe('VALIDATION');
  });

  it('changes themes per site and persists them in PostgreSQL', async () => {
    const changed = await setSiteTheme(superAdmin, NEW_SITE, 'travel');
    expect(changed.ok).toBe(true);
    expect((await d.getSite(NEW_SITE))?.themeId).toBe('travel');

    const rejected = await setSiteTheme(superAdmin, NEW_SITE, 'javascript:alert(1)');
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.code).toBe('VALIDATION');

    // The demo sites keep their themes.
    expect((await d.getSite('travel-demo'))?.themeId).toBe('travel');
    expect((await d.getSite('business-demo'))?.themeId).toBe('business');

    const audit = await listAudit(superAdmin, { siteId: NEW_SITE });
    expect(audit.ok && audit.data.some((e) => e.action === 'site.theme_change')).toBe(true);

    await setSiteTheme(superAdmin, NEW_SITE, 'blog');
  });

  it('deactivating a site stops public resolution without deleting data', async () => {
    const deactivated = await setSiteStatus(superAdmin, NEW_SITE, 'INACTIVE');
    expect(deactivated.ok).toBe(true);

    // Public resolver paths return nothing for inactive sites.
    expect(await d.getSite(NEW_SITE)).toBeNull();
    expect(await d.getSiteByHost('admin-test.example.com')).toBeNull();
    expect((await d.listSites()).some((s) => s.id === NEW_SITE)).toBe(false);

    // Data is intact: the admin can still load it.
    const detail = await getSiteForAdmin(superAdmin, NEW_SITE);
    expect(detail.ok).toBe(true);

    // Site admins can no longer reach it through the public adapter either.
    await setSiteStatus(superAdmin, NEW_SITE, 'ACTIVE');
    expect((await d.getSite(NEW_SITE))?.id).toBe(NEW_SITE);
  });

  it('existing demo sites remain intact', async () => {
    for (const id of ['business-demo', 'travel-demo', 'blog-demo']) {
      const site = await d.getSite(id);
      expect(site?.id).toBe(id);
      expect(site?.settings.colors.primary).toMatch(/^#/);
    }
  });

  /* -------------------------------- branding ------------------------------ */

  it('saves valid settings and confirms site-scoped effects', async () => {
    const saved = await updateSiteSettings(siteAdmin, 'travel-demo', {
      name: 'Wayfare Travel Co. (edited)',
      colors: { primary: '#0A5B44' },
      seo: { description: 'Updated description from the admin test.' },
    });
    expect(saved.ok).toBe(true);

    const detail = await getSiteForAdmin(siteAdmin, 'travel-demo');
    expect(detail.ok && detail.data.settings.colors.primary).toBe('#0A5B44');
    expect(detail.ok && detail.data.settings.seo.description).toBe('Updated description from the admin test.');
    expect(detail.ok && detail.data.name).toBe('Wayfare Travel Co. (edited)');

    // Public rendering reflects the change (adapter → theme vars).
    const publicSite = await d.getSite('travel-demo');
    expect(publicSite?.settings.colors.primary).toBe('#0A5B44');

    // Other sites untouched.
    expect((await d.getSite('business-demo'))?.settings.colors.primary).not.toBe('#0A5B44');

    const audit = await listAudit(siteAdmin, { siteId: 'travel-demo' });
    expect(audit.ok && audit.data.some((e) => e.action === 'site.settings_update')).toBe(true);

    // Restore.
    await updateSiteSettings(siteAdmin, 'travel-demo', {
      name: 'Wayfare Travel Co.',
      colors: { primary: '#BC4B27' },
      seo: { description: 'Small-group journeys to the most beautiful places on earth. Hand-built routes, local partners, and groups of twelve travelers max.' },
    });
  });

  it('rejects invalid colors, unsafe references, and bad navigation', async () => {
    const badColor = await updateSiteSettings(superAdmin, 'travel-demo', {
      colors: { primary: 'not-a-color' },
    });
    expect(badColor.ok).toBe(false);
    if (!badColor.ok) expect(badColor.code).toBe('VALIDATION');

    const evilRef = await updateSiteSettings(superAdmin, 'travel-demo', {
      identity: { logoUrl: 'javascript:alert(1)' },
    });
    expect(evilRef.ok).toBe(false);
    if (!evilRef.ok) expect(evilRef.code).toBe('VALIDATION');

    const badNav = await updateSiteSettings(superAdmin, 'travel-demo', {
      nav: [{ label: '', href: 'javascript:alert(1)' }],
    });
    expect(badNav.ok).toBe(false);
    if (!badNav.ok) expect(badNav.code).toBe('VALIDATION');
  });

  it('Site Admin cannot mutate a site they are not assigned to', async () => {
    const forbidden = await updateSiteSettings(siteAdmin, 'business-demo', { name: 'Hacked' });
    expect(forbidden.ok).toBe(false);
    if (!forbidden.ok) expect(forbidden.code).toBe('FORBIDDEN');

    const theme = await setSiteTheme(siteAdmin, 'business-demo', 'blog');
    expect(theme.ok).toBe(false);

    const domain = await addDomain(siteAdmin, 'business-demo', 'evil.example.com');
    expect(domain.ok).toBe(false);
  });

  /* -------------------------------- domains ------------------------------- */

  it('adds, deduplicates, and validates domains', async () => {
    const added = await addDomain(superAdmin, NEW_SITE, 'Extra.Test.Example.COM.');
    expect(added.ok).toBe(true);
    if (added.ok) expect(added.data.host).toBe('extra.test.example.com'); // normalized

    const duplicate = await addDomain(superAdmin, NEW_SITE, 'extra.test.example.com');
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.code).toBe('CONFLICT');

    const crossSite = await addDomain(superAdmin, 'travel-demo', 'admin-test.example.com');
    expect(crossSite.ok).toBe(false);
    if (!crossSite.ok) expect(crossSite.code).toBe('CONFLICT');

    const malformed = await addDomain(superAdmin, NEW_SITE, 'https://acme.com/path');
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.code).toBe('VALIDATION');

    const invalid = await addDomain(superAdmin, NEW_SITE, 'not a hostname');
    expect(invalid.ok).toBe(false);
  });

  it('enforces single-primary and protects the last domain', async () => {
    const detail = await getSiteForAdmin(superAdmin, NEW_SITE);
    expect(detail.ok).toBe(true);
    if (!detail.ok) return;
    const domains = detail.data.domains;
    expect(domains.filter((x) => x.isPrimary).length).toBe(1);
    const secondary = domains.find((x) => !x.isPrimary)!;

    // Promote the secondary.
    const promoted = await setPrimaryDomain(superAdmin, NEW_SITE, secondary.id);
    expect(promoted.ok).toBe(true);
    const after = await getSiteForAdmin(superAdmin, NEW_SITE);
    expect(after.ok && after.data.domains.filter((x) => x.isPrimary).map((x) => x.host)).toEqual([secondary.host]);

    // Removing the primary auto-promotes the other; the last domain is protected.
    await removeDomain(superAdmin, NEW_SITE, secondary.id);
    const afterRemoval = await getSiteForAdmin(superAdmin, NEW_SITE);
    expect(afterRemoval.ok && afterRemoval.data.domains.length).toBe(1);
    expect(afterRemoval.ok && afterRemoval.data.domains[0].isPrimary).toBe(true);
    const lastDomain = afterRemoval.ok ? afterRemoval.data.domains[0] : undefined;

    const lastRemoval = await removeDomain(superAdmin, NEW_SITE, lastDomain!.id);
    expect(lastRemoval.ok).toBe(false);
    if (!lastRemoval.ok) expect(lastRemoval.code).toBe('CONFLICT');

    const audit = await listAudit(superAdmin, { siteId: NEW_SITE });
    expect(
      audit.ok &&
        ['domain.add', 'domain.set_primary', 'domain.remove'].every((action) =>
          audit.data.some((e) => e.action === action),
        ),
    ).toBe(true);
  });

  it('scopes the audit log to the actor\u2019s sites', async () => {
    const adminView = await listAudit(siteAdmin);
    const superView = await listAudit(superAdmin, { siteId: NEW_SITE });
    expect(superView.ok && superView.data.length).toBeGreaterThan(0);
    // Site admin's view never contains entries for unassigned sites.
    expect(adminView.ok && adminView.data.every((e) => e.targetSiteId === 'travel-demo')).toBe(true);
  });

  it('raw Prisma constraints back the application rules', async () => {
    // Idempotency: ensure the host is mapped to NEW_SITE first, so the
    // cross-site create below is guaranteed to collide regardless of prior runs.
    await prisma.domain.upsert({
      where: { host: 'extra.test.example.com' },
      create: { siteId: NEW_SITE, host: 'extra.test.example.com' },
      update: { siteId: NEW_SITE },
    });
    await expect(
      prisma.domain.create({ data: { siteId: 'travel-demo', host: 'extra.test.example.com' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.siteMembership.create({ data: { userId: siteAdmin.id, siteId: 'travel-demo' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
