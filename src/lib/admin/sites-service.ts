import { Prisma } from '@prisma/client';
import { listThemes, isRegisteredTheme } from '@/platform/registry';
import { normalizeHost } from '@/platform/domain';
import {
  validateSiteSettings,
  ValidationError,
  validateSafeReference,
} from '@/platform/data/validation';
import { getPrisma } from '@/platform/data/prisma';
import { isDataUnavailableError } from '@/platform/data/errors';
import { assertSiteAccess, assertSuperAdmin, resolveAccessibleSiteIds } from './authz';
import { writeAudit } from './audit';
import { fail, ok, type ServiceResult } from './types';
import type { AdminSessionUser } from './types';
import type { SiteSettings } from '@/platform/types';

/**
 * Admin service layer — the only place that mutates platform data.
 *
 * Every function takes the authenticated actor, enforces authorization here
 * (never in the UI), validates all input server-side, scopes queries by the
 * actor's grants, and writes an audit entry inside the same transaction as
 * the mutation it describes. Public theme rendering never imports this
 * module.
 */

/* ------------------------------- read models ------------------------------ */

export interface AdminSiteSummary {
  id: string;
  name: string;
  themeId: string;
  status: 'ACTIVE' | 'INACTIVE';
  primaryDomain: string | null;
  domainCount: number;
  updatedAt: string;
}

export interface AdminSiteDetail extends AdminSiteSummary {
  settings: SiteSettings;
  domains: { id: number; host: string; isPrimary: boolean; verified: boolean; createdAt: string }[];
  memberships?: { userId: string; email: string; name: string }[];
  /** Forward-compatible extras bag (raw, e.g. typography). */
  extras: Record<string, unknown>;
}

export async function listSitesForAdmin(
  actor: AdminSessionUser,
  options?: { search?: string; status?: 'ACTIVE' | 'INACTIVE' | 'ALL' },
): Promise<ServiceResult<AdminSiteSummary[]>> {
  try {
    const accessible = await resolveAccessibleSiteIds(actor);
    if (accessible !== null && accessible.length === 0) return ok([]);

    const search = options?.search?.trim().toLowerCase();
    const rows = await getPrisma().site.findMany({
      where: {
        ...(accessible !== null ? { id: { in: accessible } } : {}),
        ...(options?.status && options.status !== 'ALL' ? { status: options.status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { id: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { domains: true },
      orderBy: { id: 'asc' },
    });

    return ok(
      rows.map((row) => {
        const primary = row.domains.find((d) => d.isPrimary) ?? row.domains[0];
        return {
          id: row.id,
          name: row.name,
          themeId: row.themeId,
          status: row.status,
          primaryDomain: primary?.host ?? null,
          domainCount: row.domains.length,
          updatedAt: row.updatedAt.toISOString(),
        };
      }),
    );
  } catch (error) {
    return handleDbError(error, 'list websites');
  }
}

export async function getSiteForAdmin(
  actor: AdminSessionUser,
  siteId: string,
): Promise<ServiceResult<AdminSiteDetail>> {
  try {
    await assertSiteAccess(actor, siteId);
    const row = await getPrisma().site.findUnique({
      where: { id: siteId },
      include: {
        domains: { orderBy: [{ isPrimary: 'desc' }, { host: 'asc' }] },
        settings: true,
      },
    });
    if (!row?.settings) return fail('Website not found.', 'NOT_FOUND');

    const memberships =
      actor.role === 'SUPER_ADMIN'
        ? await getPrisma().siteMembership.findMany({
            where: { siteId },
            include: { user: { select: { email: true, name: true } } },
          })
        : [];

    const rawExtras = (row.settings.extras ?? {}) as Record<string, unknown>;
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

    return ok({
      id: row.id,
      name: row.name,
      themeId: row.themeId,
      status: row.status,
      primaryDomain: row.domains.find((d) => d.isPrimary)?.host ?? row.domains[0]?.host ?? null,
      domainCount: row.domains.length,
      updatedAt: row.updatedAt.toISOString(),
      settings,
      domains: row.domains.map((d) => ({
        id: d.id,
        host: d.host,
        isPrimary: d.isPrimary,
        verified: d.verified,
        createdAt: d.createdAt.toISOString(),
      })),
      memberships: memberships.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
      })),
      extras: rawExtras,
    });
  } catch (error) {
    return handleError(error, 'load website');
  }
}

/* -------------------------------- mutations ------------------------------- */

export interface CreateSiteInput {
  siteId: string;
  name: string;
  themeId: string;
  primaryDomain?: string;
  tagline?: string;
}

export async function createSite(
  actor: AdminSessionUser,
  input: CreateSiteInput,
): Promise<ServiceResult<{ siteId: string }>> {
  try {
    assertSuperAdmin(actor);

    const siteId = input.siteId?.trim().toLowerCase() ?? '';
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(siteId)) {
      return fail(
        'Site ID must be 2-63 characters: lowercase letters, digits, and hyphens (no leading hyphen).',
        'VALIDATION',
      );
    }
    const name = input.name?.trim() ?? '';
    if (name.length < 2 || name.length > 120) {
      return fail('Display name must be between 2 and 120 characters.', 'VALIDATION');
    }
    if (!isRegisteredTheme(input.themeId)) {
      return fail(`Unknown theme "${input.themeId}". Pick a registered theme.`, 'VALIDATION');
    }

    const domain = input.primaryDomain?.trim();
    let normalizedDomain: string | null = null;
    if (domain) {
      if (/[:/\\?#@]/.test(domain)) {
        return fail(
          'Primary domain must be a bare hostname — no scheme, path, port, or credentials.',
          'VALIDATION',
        );
      }
      normalizedDomain = normalizeHost(domain);
      if (!normalizedDomain) {
        return fail('Primary domain is not a valid hostname.', 'VALIDATION');
      }
    }

    const existing = await getPrisma().site.findUnique({ where: { id: siteId }, select: { id: true } });
    if (existing) {
      return fail(`A website with ID "${siteId}" already exists.`, 'CONFLICT');
    }
    if (normalizedDomain) {
      const taken = await getPrisma().domain.findUnique({ where: { host: normalizedDomain } });
      if (taken) {
        return fail(`Hostname "${normalizedDomain}" is already mapped to another website.`, 'CONFLICT');
      }
    }

    const defaultSettings = defaultSettingsFor(siteId, name, input.tagline?.trim() || `${name} website`);

    const created = await getPrisma().$transaction(async (tx) => {
      const site = await tx.site.create({
        data: { id: siteId, name, themeId: input.themeId, status: 'ACTIVE' },
      });
      await tx.siteSettings.create({
        data: {
          siteId: site.id,
          identity: defaultSettings.identity as never,
          colors: defaultSettings.colors as never,
          nav: defaultSettings.nav as never,
          footerNav: defaultSettings.footerNav as never,
          seo: defaultSettings.seo as never,
          extras: { landingBlurb: defaultSettings.landingBlurb } as never,
        },
      });
      if (normalizedDomain) {
        await tx.domain.create({ data: { siteId: site.id, host: normalizedDomain, isPrimary: true, verified: false } });
      }
      await writeAudit(tx, {
        actor,
        action: 'site.create',
        targetSiteId: site.id,
        summary: `Created website "${name}" (${site.id}) with theme "${input.themeId}".`,
        metadata: { primaryDomain: normalizedDomain },
      });
      return site;
    });

    return ok({ siteId: created.id });
  } catch (error) {
    return handleError(error, 'create website');
  }
}

export async function updateSiteMeta(
  actor: AdminSessionUser,
  siteId: string,
  input: { name: string },
): Promise<ServiceResult<{ name: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const name = input.name?.trim() ?? '';
    if (name.length < 2 || name.length > 120) {
      return fail('Display name must be between 2 and 120 characters.', 'VALIDATION');
    }
    await getPrisma().$transaction(async (tx) => {
      await tx.site.update({ where: { id: siteId }, data: { name } });
      await writeAudit(tx, {
        actor,
        action: 'site.update',
        targetSiteId: siteId,
        summary: `Renamed website to "${name}".`,
      });
    });
    return ok({ name });
  } catch (error) {
    return handleError(error, 'update website name');
  }
}

export async function setSiteStatus(
  actor: AdminSessionUser,
  siteId: string,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<ServiceResult<{ status: string }>> {
  try {
    assertSuperAdmin(actor);
    const current = await getPrisma().site.findUnique({ where: { id: siteId }, select: { status: true } });
    if (!current) return fail('Website not found.', 'NOT_FOUND');
    if (current.status === status) return ok({ status });

    await getPrisma().$transaction(async (tx) => {
      await tx.site.update({ where: { id: siteId }, data: { status } });
      await writeAudit(tx, {
        actor,
        action: 'site.status_change',
        targetSiteId: siteId,
        summary: `Website ${status === 'ACTIVE' ? 'activated' : 'deactivated'} (public resolution ${status === 'ACTIVE' ? 'restored' : 'disabled'}).`,
      });
    });
    return ok({ status });
  } catch (error) {
    return handleError(error, 'change website status');
  }
}

export async function setSiteTheme(
  actor: AdminSessionUser,
  siteId: string,
  themeId: string,
): Promise<ServiceResult<{ themeId: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    // Theme ids are validated against the registry (native themes) or the
    // installed-package store (package:<id>) — arbitrary strings never
    // reach the DB.
    const { isValidThemeReference } = await import('@/lib/theme-package/store');
    if (!(isRegisteredTheme(themeId) || (themeId.startsWith('package:') && (await isValidThemeReference(themeId))))) {
      return fail(`Unknown theme "${themeId}".`, 'VALIDATION');
    }
    const site = await getPrisma().site.findUnique({ where: { id: siteId }, select: { themeId: true } });
    if (!site) return fail('Website not found.', 'NOT_FOUND');

    await getPrisma().$transaction(async (tx) => {
      await tx.site.update({ where: { id: siteId }, data: { themeId } });
      await writeAudit(tx, {
        actor,
        action: 'site.theme_change',
        targetSiteId: siteId,
        summary: `Active theme changed from "${site.themeId}" to "${themeId}".`,
      });
    });
    return ok({ themeId });
  } catch (error) {
    return handleError(error, 'change theme');
  }
}

/* ----------------------------- site settings ------------------------------ */

const TYPOGRAPHY_ALLOWLIST = ['system', 'sans', 'serif', 'mono', 'rounded'] as const;

export interface SiteSettingsInput {
  name?: string;
  identity?: {
    name?: string;
    tagline?: string;
    logoText?: string;
    logoInitials?: string;
    logoUrl?: string;
    faviconUrl?: string;
  };
  colors?: Partial<Record<'primary' | 'primaryForeground' | 'accent' | 'background' | 'foreground' | 'muted' | 'mutedForeground' | 'border' | 'dark' | 'darkForeground', string>>;
  nav?: { label: string; href: string }[];
  footerNav?: { label: string; href: string }[];
  seo?: {
    defaultTitle?: string;
    titleTemplate?: string;
    description?: string;
    keywords?: string;
    socialImage?: string;
    twitterHandle?: string;
  };
  typography?: { headingFont?: string; bodyFont?: string };
}

function validateNavEntries(
  entries: { label: string; href: string }[] | undefined,
  field: string,
): { label: string; href: string }[] | undefined {
  if (entries === undefined) return undefined;
  if (!Array.isArray(entries) || entries.length > 12) {
    throw new ValidationError(`${field} must contain at most 12 items.`);
  }
  return entries.map((entry, i) => {
    const label = (entry.label ?? '').trim();
    const href = (entry.href ?? '').trim();
    if (label.length < 1 || label.length > 60) {
      throw new ValidationError(`${field}[${i}].label must be 1-60 characters.`);
    }
    if (!href.startsWith('/') && !/^https?:\/\//.test(href)) {
      throw new ValidationError(`${field}[${i}].href must be an app path or http(s) URL.`);
    }
    if (href.length > 500) throw new ValidationError(`${field}[${i}].href is too long.`);
    return { label, href };
  });
}

export async function updateSiteSettings(
  actor: AdminSessionUser,
  siteId: string,
  input: SiteSettingsInput,
): Promise<ServiceResult<{ saved: true }>> {
  try {
    await assertSiteAccess(actor, siteId);

    const row = await getPrisma().site.findUnique({
      where: { id: siteId },
      include: { settings: true },
    });
    if (!row?.settings) return fail('Website not found.', 'NOT_FOUND');
    const rawExtras = (row.settings.extras ?? {}) as Record<string, unknown>;
    const current = validateSiteSettings(
      {
        identity: row.settings.identity,
        colors: row.settings.colors,
        nav: row.settings.nav,
        footerNav: row.settings.footerNav,
        seo: row.settings.seo,
        extras: row.settings.extras ?? undefined,
      },
      `site "${siteId}" settings`,
    );

    // Explicit field selection only (no mass assignment): each section is
    // picked and validated independently, unknown keys are ignored.
    const merged = {
      identity: {
        ...current.identity,
        name: input.name?.trim() || row.name,
        ...(input.identity?.tagline !== undefined ? { tagline: input.identity.tagline } : {}),
        ...(input.identity?.logoText !== undefined ? { logoText: input.identity.logoText } : {}),
        ...(input.identity?.logoInitials !== undefined
          ? { logoInitials: input.identity.logoInitials }
          : {}),
        ...(input.identity?.logoUrl !== undefined ? { logoUrl: input.identity.logoUrl } : {}),
        ...(input.identity?.faviconUrl !== undefined
          ? { faviconUrl: input.identity.faviconUrl }
          : {}),
      },
      colors: { ...current.colors, ...(input.colors ?? {}) },
      nav: input.nav !== undefined ? validateNavEntries(input.nav, 'nav') : current.nav,
      footerNav:
        input.footerNav !== undefined ? validateNavEntries(input.footerNav, 'footerNav') : current.footerNav,
      seo: {
        ...current.seo,
        ...(input.seo?.defaultTitle !== undefined ? { defaultTitle: input.seo.defaultTitle } : {}),
        ...(input.seo?.titleTemplate !== undefined ? { titleTemplate: input.seo.titleTemplate } : {}),
        ...(input.seo?.description !== undefined ? { description: input.seo.description } : {}),
        ...(input.seo?.keywords !== undefined
          ? {
              keywords: input.seo.keywords
                .split(',')
                .map((k) => k.trim())
                .filter(Boolean)
                .slice(0, 12),
            }
          : {}),
        ...(input.seo?.socialImage !== undefined
          ? { socialImage: validateSafeReference(input.seo.socialImage, 'seo.socialImage') }
          : {}),
        ...(input.seo?.twitterHandle !== undefined ? { twitterHandle: input.seo.twitterHandle } : {}),
      },
    } as SiteSettings;

    const validated = validateSiteSettings(
      { ...merged, extras: rawExtras },
      `site "${siteId}" settings`,
    );

    // Typography (allowlist) rides in the forward-compatible extras bag.
    const extras = { ...rawExtras };
    if (input.typography !== undefined) {
      const clean: Record<string, string> = {};
      for (const key of ['headingFont', 'bodyFont'] as const) {
        const value = input.typography[key];
        if (value !== undefined) {
          if (!(TYPOGRAPHY_ALLOWLIST as readonly string[]).includes(value)) {
            return fail(`Typography "${key}" must be one of: ${TYPOGRAPHY_ALLOWLIST.join(', ')}.`, 'VALIDATION');
          }
          clean[key] = value;
        }
      }
      extras.typography = clean;
    }

    const siteName = input.name?.trim() || row.name;
    if (siteName.length < 2 || siteName.length > 120) {
      return fail('Display name must be between 2 and 120 characters.', 'VALIDATION');
    }

    await getPrisma().$transaction(async (tx) => {
      await tx.site.update({ where: { id: siteId }, data: { name: siteName } });
      await tx.siteSettings.update({
        where: { siteId },
        data: {
          identity: validated.identity as never,
          colors: validated.colors as never,
          nav: validated.nav as never,
          footerNav: validated.footerNav as never,
          seo: validated.seo as never,
          extras: extras as never,
        },
      });
      await writeAudit(tx, {
        actor,
        action: 'site.settings_update',
        targetSiteId: siteId,
        summary: `Branding/SEO settings updated for "${siteName}".`,
        metadata: {
          sections: [
            input.identity && 'identity',
            input.colors && 'colors',
            input.nav && 'nav',
            input.footerNav && 'footerNav',
            input.seo && 'seo',
            input.typography && 'typography',
          ].filter(Boolean),
        },
      });
    });

    return ok({ saved: true });
  } catch (error) {
    return handleError(error, 'update website settings');
  }
}

/* -------------------------------- domains --------------------------------- */

export async function addDomain(
  actor: AdminSessionUser,
  siteId: string,
  rawHost: string,
): Promise<ServiceResult<{ host: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    if (/[:/\\?#@]/.test(rawHost)) {
      return fail(
        'Enter a bare hostname — no scheme, path, port, or credentials.',
        'VALIDATION',
      );
    }
    const host = normalizeHost(rawHost);
    if (!host) return fail('That value is not a valid hostname.', 'VALIDATION');

    const taken = await getPrisma().domain.findUnique({ where: { host }, select: { siteId: true } });
    if (taken) {
      return fail(
        taken.siteId === siteId
          ? `"${host}" is already mapped to this website.`
          : `"${host}" is already mapped to another website.`,
        'CONFLICT',
      );
    }

    await getPrisma().$transaction(async (tx) => {
      await tx.domain.create({
        data: { siteId, host, isPrimary: false, verified: false },
      });
      await writeAudit(tx, {
        actor,
        action: 'domain.add',
        targetSiteId: siteId,
        summary: `Domain "${host}" mapped (unverified).`,
      });
    });
    return ok({ host });
  } catch (error) {
    return handleError(error, 'add domain');
  }
}

export async function setPrimaryDomain(
  actor: AdminSessionUser,
  siteId: string,
  domainId: number,
): Promise<ServiceResult<{ host: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const result = await getPrisma().$transaction(async (tx) => {
      const domain = await tx.domain.findUnique({ where: { id: domainId } });
      if (!domain || domain.siteId !== siteId) return null;
      await tx.domain.updateMany({ where: { siteId }, data: { isPrimary: false } });
      await tx.domain.update({ where: { id: domainId }, data: { isPrimary: true } });
      await writeAudit(tx, {
        actor,
        action: 'domain.set_primary',
        targetSiteId: siteId,
        summary: `"${domain.host}" is now the primary domain.`,
      });
      return domain;
    });
    if (!result) return fail('Domain not found for this website.', 'NOT_FOUND');
    return ok({ host: result.host });
  } catch (error) {
    return handleError(error, 'set primary domain');
  }
}

export async function removeDomain(
  actor: AdminSessionUser,
  siteId: string,
  domainId: number,
): Promise<ServiceResult<{ removed: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const result = await getPrisma().$transaction(async (tx) => {
      const domain = await tx.domain.findUnique({ where: { id: domainId } });
      if (!domain || domain.siteId !== siteId) return null;

      const remaining = await tx.domain.count({ where: { siteId } });
      if (remaining <= 1) {
        // Policy: a website keeps at least one hostname so it stays resolvable.
        throw new Error('LAST_DOMAIN');
      }

      await tx.domain.delete({ where: { id: domainId } });
      if (domain.isPrimary) {
        // Promote the oldest remaining domain so the site keeps a primary.
        const next = await tx.domain.findFirst({
          where: { siteId },
          orderBy: { createdAt: 'asc' },
        });
        if (next) {
          await tx.domain.update({ where: { id: next.id }, data: { isPrimary: true } });
        }
      }
      await writeAudit(tx, {
        actor,
        action: 'domain.remove',
        targetSiteId: siteId,
        summary: `Domain "${domain.host}" removed.`,
      });
      return domain;
    });
    if (!result) return fail('Domain not found for this website.', 'NOT_FOUND');
    return ok({ removed: result.host });
  } catch (error) {
    if (error instanceof Error && error.message === 'LAST_DOMAIN') {
      return fail(
        'This is the only remaining domain for the website and cannot be removed.',
        'CONFLICT',
      );
    }
    return handleError(error, 'remove domain');
  }
}

/* --------------------------------- audit ---------------------------------- */

export interface AuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetSiteId: string | null;
  summary: string;
  createdAt: string;
}

export async function listAudit(
  actor: AdminSessionUser,
  options?: { siteId?: string; limit?: number },
): Promise<ServiceResult<AuditEntry[]>> {
  try {
    let scope: string[] | null = null;
    if (options?.siteId) {
      await assertSiteAccess(actor, options.siteId);
      scope = [options.siteId];
    } else {
      scope = await resolveAccessibleSiteIds(actor);
    }
    const rows = await getPrisma().auditLog.findMany({
      where: scope !== null ? { targetSiteId: { in: scope } } : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(options?.limit ?? 50, 200),
    });
    return ok(
      rows.map((row) => ({
        id: row.id.toString(),
        actorEmail: row.actorEmail,
        action: row.action,
        targetSiteId: row.targetSiteId,
        summary: row.summary,
        createdAt: row.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    return handleError(error, 'load audit log');
  }
}

/* --------------------------------- helpers -------------------------------- */

function defaultSettingsFor(siteId: string, name: string, tagline: string): SiteSettings {
  return {
    identity: {
      name,
      tagline,
      logoText: name.split(/\s+/)[0]?.slice(0, 20) || name,
      logoInitials: (name.match(/\b\w/g) ?? [name.slice(0, 2)])
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join(''),
    },
    colors: {
      primary: '#154D74',
      primaryForeground: '#FFFFFF',
      accent: '#C9973B',
      background: '#FFFFFF',
      foreground: '#0F172A',
      muted: '#F3F6FA',
      mutedForeground: '#5B6B80',
      border: '#E2E8F0',
      dark: '#0B1D31',
      darkForeground: '#DCE5EF',
    },
    nav: [
      { label: 'Home', href: '/' },
      { label: 'Contact', href: '/contact' },
    ],
    footerNav: [{ label: 'Contact', href: '/contact' }],
    seo: {
      defaultTitle: name,
      titleTemplate: `%s · ${name}`,
      description: tagline,
      keywords: [],
    },
    landingBlurb: `New website (${siteId}). Configure branding and content before launch.`,
  };
}

function handleDbError(error: unknown, context: string): ServiceResult<never> {
  if (isDataUnavailableError(error)) {
    return fail('The database is temporarily unavailable. Try again shortly.', 'UNAVAILABLE');
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return fail('That value is already in use.', 'CONFLICT');
  }
  return fail(`Could not ${context}. Please try again.`, 'UNAVAILABLE');
}

function handleError(error: unknown, context: string): ServiceResult<never> {
  if (error instanceof ValidationError) {
    return fail(error.message, 'VALIDATION');
  }
  if (isDataUnavailableError(error)) {
    return fail('The database is temporarily unavailable. Try again shortly.', 'UNAVAILABLE');
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return fail('That value is already in use.', 'CONFLICT');
  }
  // ForbiddenError propagates to the action layer which maps it to FORBIDDEN.
  if (error instanceof Error && error.name === 'ForbiddenError') {
    return fail(error.message, 'FORBIDDEN');
  }
  console.error(`[admin] failed to ${context}:`, error instanceof Error ? error.message : error);
  return fail(`Could not ${context}. Please try again.`, 'UNAVAILABLE');
}

/** Re-export for the UI (theme cards). */
export { listThemes };
