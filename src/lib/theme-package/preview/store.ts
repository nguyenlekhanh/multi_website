import { randomUUID } from 'node:crypto';
import { ALLOWED_PREVIEW_MIME, type ValidationError } from '../spec';
import type { ValidatedThemePackage } from '../spec';
import { validatePackage, type PackageFiles } from '../validate';

/**
 * Preview Lab in-memory store for UNINSTALLED packages.
 *
 * An uploaded ZIP is validated exactly like an install (same validator, same
 * limits, same CSS sanitizer) but kept only in this process' memory under a
 * random token, with a short TTL. Nothing touches the database, no site's
 * active theme changes, and the package never becomes installable from here.
 *
 * Trade-off (documented for Phase 10): the store is per-process, so a
 * multi-instance deployment would need a signed-upload flow or a scoped
 * database row to make preview survives instance routing.
 */

export interface PreviewEntry {
  token: string;
  pkg: ValidatedThemePackage;
  /** Original validated file map — the only source for `assets/` requests. */
  files: PackageFiles;
  createdAt: number;
  expiresAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 8;

const entries = new Map<string, PreviewEntry>();

function purgeExpired(now: number): void {
  for (const [token, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(token);
  }
}

export type PreviewStoreResult =
  | { ok: true; token: string; expiresAt: number }
  | { ok: false; errors: ValidationError[] };

/**
 * Validate an uploaded file map and stage it for preview. Rejections carry
 * the same field-level errors the installer would report.
 */
export function putPreviewPackage(files: PackageFiles, now: number = Date.now()): PreviewStoreResult {
  const result = validatePackage(files);
  if (!result.ok) return { ok: false, errors: result.errors };

  purgeExpired(now);
  if (entries.size >= MAX_ENTRIES) {
    // Drop the oldest entry; the lab is a scratch space, not an archive.
    const oldest = [...entries.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
    if (oldest) entries.delete(oldest.token);
  }

  const token = randomUUID();
  entries.set(token, {
    token,
    pkg: result.pkg,
    files,
    createdAt: now,
    expiresAt: now + TTL_MS,
  });
  return { ok: true, token, expiresAt: now + TTL_MS };
}

export function getPreviewPackage(token: string, now: number = Date.now()): PreviewEntry | null {
  purgeExpired(now);
  return entries.get(token) ?? null;
}

const ASSET_MIME_BY_EXT = (ext: string): string | null =>
  ext in ALLOWED_PREVIEW_MIME ? ALLOWED_PREVIEW_MIME[ext] : null;

/**
 * Serve an `assets/…` file from a staged preview package. Exact-key lookup
 * only — traversal-style paths simply never match a stored key, and only
 * image extensions are ever served.
 */
export function getPreviewPackageAsset(
  token: string,
  assetPath: string,
  now: number = Date.now(),
): { data: Uint8Array; mime: string } | null {
  const entry = getPreviewPackage(token, now);
  if (!entry) return null;
  const normalized = assetPath.replace(/^assets\//, '');
  const key = `assets/${normalized}`;
  const data = entry.files.get(key);
  if (!data) return null;
  const dot = normalized.lastIndexOf('.');
  const mime = dot === -1 ? null : ASSET_MIME_BY_EXT(normalized.slice(dot + 1).toLowerCase());
  if (!mime) return null;
  return { data, mime };
}

/** Test/ops helper: drop everything (the store is volatile by design). */
export function clearPreviewPackages(): void {
  entries.clear();
}
