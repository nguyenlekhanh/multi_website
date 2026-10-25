import { getPrisma } from '@/platform/data/prisma';
import { isDataUnavailableError } from '@/platform/data/errors';
import { validatePackage, compareSemver, type PackageFiles, type ValidationResult } from './validate';
import { readZip } from './zip';
import {
  NATIVE_THEME_IDS,
  PACKAGE_LIMITS,
  PACKAGE_PREFIX,
  type ValidatedThemePackage,
} from './spec';
import type { ThemeDefinition } from '@/platform/types';
import type { AdminSessionUser } from '@/lib/admin/types';
import { assertSuperAdmin } from '@/lib/admin/authz';

/**
 * Theme package store + install/activate lifecycle.
 *
 * Packages live in PostgreSQL (manifest/templates/CSS as JSON/text, preview
 * as bytes) — no filesystem persistence, so Vercel's ephemeral disks are
 * fine. Validated once at install; rendering reads the in-process cache,
 * which install/rollback/uninstall invalidate. Super Admin gates install/
 * rollback/uninstall (platform-wide assets); activation uses the same
 * per-site authorization as native themes.
 */

export interface InstalledThemeInfo {
  themeId: string;
  name: string;
  description: string;
  version: string;
  authorName: string;
  status: 'CURRENT' | 'ARCHIVED';
  fileCount: number;
  totalBytes: number;
  hasPreview: boolean;
  updatedAt: string;
}

/** themeId → validated package (CURRENT version). */
const cache = new Map<string, ValidatedThemePackage>();

function invalidate(themeId?: string): void {
  if (themeId) cache.delete(themeId);
  else cache.clear();
}

function toValidated(row: {
  manifest: unknown;
  templates: unknown;
  css: string;
}): ValidatedThemePackage | null {
  // Rows were validated at install; reconstruct without re-running the
  // file-map validator (JSON was already parsed and scoped).
  const pkg = {
    manifest: row.manifest as ValidatedThemePackage['manifest'],
    templates: row.templates as ValidatedThemePackage['templates'],
    css: row.css,
    stats: { fileCount: 0, totalBytes: 0 },
  } as ValidatedThemePackage;
  return pkg;
}

/* -------------------------------- lookups ---------------------------------- */

export async function listInstalledThemes(): Promise<InstalledThemeInfo[]> {
  const rows = await getPrisma().themePackage.findMany({
    orderBy: [{ themeId: 'asc' }, { createdAt: 'desc' }],
  });
  const seen = new Map<string, InstalledThemeInfo>();
  for (const row of rows) {
    const info: InstalledThemeInfo = {
      themeId: row.themeId,
      name: row.name,
      description: row.description,
      version: row.version,
      authorName: row.authorName,
      status: row.status,
      fileCount: row.fileCount,
      totalBytes: row.totalBytes,
      hasPreview: row.previewImage !== null,
      updatedAt: row.updatedAt.toISOString(),
    };
    if (row.status === 'CURRENT' || !seen.has(row.themeId)) seen.set(row.themeId, info);
  }
  return [...seen.values()];
}

export async function getInstalledTheme(themeId: string): Promise<ValidatedThemePackage | null> {
  const cached = cache.get(themeId);
  if (cached) return cached;
  const row = await getPrisma().themePackage.findFirst({
    where: { themeId, status: 'CURRENT' },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return null;
  const pkg = toValidated(row);
  if (!pkg) return null;
  cache.set(themeId, pkg);
  return pkg;
}

export async function getPackageAsset(themeId: string, assetPath: string): Promise<{ data: Uint8Array; mime: string } | null> {
  // Only the preview image is stored in v1; template assets resolve to it.
  const row = await getPrisma().themePackage.findFirst({
    where: { themeId, status: 'CURRENT' },
    orderBy: { createdAt: 'desc' },
    select: { previewImage: true, previewMime: true },
  });
  if (!row?.previewImage) return null;
  const normalized = assetPath.replace(/^assets\//, '');
  if (normalized !== 'preview' && !normalized.startsWith('preview.')) {
    // Packages may ship assets/preview.png — accept that exact reference.
    const row2 = await getPrisma().themePackage.findFirst({
      where: { themeId, status: 'CURRENT' },
      orderBy: { createdAt: 'desc' },
      select: { manifest: true },
    });
    const manifest = row2?.manifest as { preview?: string } | null;
    if (manifest?.preview !== assetPath) return null;
  }
  return { data: new Uint8Array(row.previewImage), mime: row.previewMime ?? 'image/png' };
}

/** Resolve a site theme reference (`id` or `package:id`) to a definition. */
export async function resolveThemeDefinition(themeId: string | null | undefined): Promise<ThemeDefinition> {
  // Registry + renderer are lazy: they pull next/link and the whole native
  // theme graph, which only exists inside the Next.js runtime. CLI tools
  // (install) load this module without them.
  const { getTheme } = await import('@/platform/registry');
  if (themeId?.startsWith(PACKAGE_PREFIX)) {
    const pkg = await getInstalledTheme(themeId.slice(PACKAGE_PREFIX.length));
    if (pkg) {
      const { packageThemeDefinition } = await import('./renderer');
      return packageThemeDefinition(pkg);
    }
    // Missing/stale package → documented safe fallback to a native theme.
    return getTheme(null);
  }
  return getTheme(themeId);
}

export async function isValidThemeReference(themeId: string | null | undefined): Promise<boolean> {
  if (!themeId) return false;
  if (themeId.startsWith(PACKAGE_PREFIX)) {
    const pkg = await getInstalledTheme(themeId.slice(PACKAGE_PREFIX.length));
    return pkg !== null;
  }
  const { isRegisteredTheme } = await import('@/platform/registry');
  return isRegisteredTheme(themeId);
}

/* --------------------------------- install ---------------------------------- */

export type InstallResult =
  | { ok: true; themeId: string; version: string; updated: boolean }
  | { ok: false; error: string; errors?: Array<{ path: string; message: string }> };

/** Validate + install a theme ZIP (Super Admin). */
export async function installThemePackage(actor: AdminSessionUser, zipBytes: Uint8Array): Promise<InstallResult> {
  try {
    assertSuperAdmin(actor);
  } catch {
    return { ok: false, error: 'Only Super Admins can install theme packages.' };
  }
  if (zipBytes.byteLength > PACKAGE_LIMITS.maxCompressedBytes) {
    return { ok: false, error: `ZIP exceeds ${PACKAGE_LIMITS.maxCompressedBytes} bytes.` };
  }

  const zip = readZip(zipBytes);
  if (!zip.ok) return { ok: false, error: zip.error };
  const files: PackageFiles = new Map(zip.entries.map((e) => [e.name, e.data]));
  // Guard against the writer's own wrapper: accept a single common root dir.
  const names = [...files.keys()];
  const firstSegs = new Set(names.map((n) => n.split('/')[0]));
  if (firstSegs.size === 1 && !names.includes('theme.json')) {
    // strip one wrapper directory
    files.clear();
    for (const e of zip.entries) {
      const stripped = e.name.split('/').slice(1).join('/');
      if (stripped) files.set(stripped, e.data);
    }
  }

  const validation: ValidationResult = validatePackage(files);
  if (!validation.ok) {
    return { ok: false, error: 'Package validation failed.', errors: validation.errors };
  }
  const pkg = validation.pkg;
  const { manifest } = pkg;

  if ((NATIVE_THEME_IDS as readonly string[]).includes(manifest.id)) {
    return { ok: false, error: `Theme id "${manifest.id}" collides with a built-in theme.` };
  }

  const prisma = getPrisma();
  try {
    const existing = await prisma.themePackage.findFirst({
      where: { themeId: manifest.id },
      orderBy: { createdAt: 'desc' },
    });
    if (existing && existing.version === manifest.version) {
      return { ok: false, error: `Version ${manifest.version} of "${manifest.id}" is already installed.` };
    }
    if (existing && compareSemver(manifest.version, existing.version) < 0) {
      return { ok: false, error: `Version ${manifest.version} is older than the installed ${existing.version}. Use rollback instead.` };
    }

    const updated = Boolean(existing);
    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.themePackage.updateMany({ where: { themeId: manifest.id }, data: { status: 'ARCHIVED' } });
      }
      await tx.themePackage.create({
        data: {
          themeId: manifest.id,
          version: manifest.version,
          status: 'CURRENT',
          name: manifest.name,
          description: manifest.description,
          authorName: manifest.author.name,
          manifest: manifest as never,
          templates: pkg.templates as never,
          css: pkg.css,
          previewImage: pkg.preview ? Buffer.from(pkg.preview.data) : null,
          previewMime: pkg.preview?.mime ?? null,
          fileCount: pkg.stats.fileCount,
          totalBytes: pkg.stats.totalBytes,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorEmail: actor.email,
          action: updated ? 'theme.package_update' : 'theme.package_install',
          summary: `${updated ? 'Updated' : 'Installed'} theme package "${manifest.id}" v${manifest.version} (${pkg.stats.fileCount} files).`,
          metadata: { themeId: manifest.id, version: manifest.version },
        },
      });
    });
    invalidate(manifest.id);
    return { ok: true, themeId: manifest.id, version: manifest.version, updated };
  } catch (error) {
    if (isDataUnavailableError(error)) return { ok: false, error: 'Database unavailable.' };
    console.error('[theme-package] install failed:', error instanceof Error ? error.message : error);
    return { ok: false, error: 'Installation failed unexpectedly.' };
  }
}

/** Roll the CURRENT pointer back to an archived version (Super Admin). */
export async function rollbackThemePackage(actor: AdminSessionUser, themeId: string, version: string): Promise<InstallResult> {
  try {
    assertSuperAdmin(actor);
  } catch {
    return { ok: false, error: 'Only Super Admins can roll back theme packages.' };
  }
  const prisma = getPrisma();
  try {
    const target = await prisma.themePackage.findUnique({
      where: { themeId_version: { themeId, version } },
    });
    if (!target) return { ok: false, error: 'That version is not installed.' };
    await prisma.$transaction([
      prisma.themePackage.updateMany({ where: { themeId }, data: { status: 'ARCHIVED' } }),
      prisma.themePackage.update({ where: { id: target.id }, data: { status: 'CURRENT' } }),
      prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorEmail: actor.email,
          action: 'theme.package_rollback',
          summary: `Rolled theme package "${themeId}" back to v${version}.`,
        },
      }),
    ]);
    invalidate(themeId);
    return { ok: true, themeId, version, updated: true };
  } catch (error) {
    if (isDataUnavailableError(error)) return { ok: false, error: 'Database unavailable.' };
    return { ok: false, error: 'Rollback failed.' };
  }
}

/** Uninstall every version — refused while any site uses the package. */
export async function uninstallThemePackage(actor: AdminSessionUser, themeId: string): Promise<InstallResult> {
  try {
    assertSuperAdmin(actor);
  } catch {
    return { ok: false, error: 'Only Super Admins can uninstall theme packages.' };
  }
  const prisma = getPrisma();
  try {
    const reference = `${PACKAGE_PREFIX}${themeId}`;
    const inUse = await prisma.site.count({ where: { themeId: reference } });
    if (inUse > 0) {
      return { ok: false, error: `"${themeId}" is active on ${inUse} website(s). Switch them to another theme first.` };
    }
    const deleted = await prisma.themePackage.deleteMany({ where: { themeId } });
    if (deleted.count === 0) return { ok: false, error: 'Package not found.' };
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'theme.package_uninstall',
        summary: `Uninstalled theme package "${themeId}" (${deleted.count} version(s)).`,
      },
    });
    invalidate(themeId);
    return { ok: true, themeId, version: '', updated: false };
  } catch (error) {
    if (isDataUnavailableError(error)) return { ok: false, error: 'Database unavailable.' };
    return { ok: false, error: 'Uninstall failed.' };
  }
}
