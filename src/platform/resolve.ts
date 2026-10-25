import { headers } from 'next/headers';
import { db } from './data';
import { SITE_HOST_HEADER, SITE_ID_HEADER } from './constants';
import { getTheme, isRegisteredTheme } from './registry';
import type { Site, SiteContext } from './types';

/**
 * Site resolver.
 *
 * Middleware stamps the request with:
 *   - `x-site-host` : the raw request hostname (always)
 *   - `x-site-id`   : an explicit preview site id (dev preview cookie), when present
 *
 * Resolution order is data-source driven and production-safe:
 *   1. The request hostname is looked up in the configured domains of the
 *      active data source (PostgreSQL rows in production) — a mapped domain
 *      always wins, so a stale preview cookie can never hijack a real domain.
 *   2. Otherwise the preview site id (validated against the data source) is
 *      used — this is the local development preview mode.
 *   3. Otherwise the request is unmapped (the caller renders the platform
 *      landing page).
 *
 * This module is the only place in the codebase that turns a request into a
 * site, so themes and pages never duplicate resolution logic.
 */

export { SITE_HOST_HEADER, SITE_ID_HEADER, PREVIEW_COOKIE } from './constants';

export interface ResolveResult {
  ctx: SiteContext | null;
  /** Normalized hostname from the request, when provided. */
  host: string | null;
}

export async function resolveSite(): Promise<ResolveResult> {
  const h = await headers();
  const rawHost =
    h.get('x-forwarded-host')?.split(',')[0]?.trim() || h.get(SITE_HOST_HEADER) || h.get('host');
  const host = rawHost ? rawHost.split(':')[0]?.trim().toLowerCase() || null : null;

  // 1. Mapped hostname wins (production path; keeps domains authoritative).
  if (host) {
    const site = await db.getSiteByHost(host);
    if (site) {
      return { ctx: await buildContext(site, { preview: false }), host };
    }
  }

  // 2. Explicit dev preview site (cookie set by /preview/{siteId}).
  const siteId = h.get(SITE_ID_HEADER);
  if (siteId) {
    const site = await db.getSite(siteId);
    if (site) {
      return { ctx: await buildContext(site, { preview: true }), host };
    }
  }

  // 3. Unmapped host.
  return { ctx: null, host };
}

async function buildContext(site: Site, options: { preview: boolean }): Promise<SiteContext> {
  const h = await headers();
  const proto = h.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http';
  const requestHost = h.get('x-forwarded-host')?.split(',')[0]?.trim() || h.get('host') || site.domain;

  // Validate the theme identifier: unknown ids never break rendering.
  // Package references (package:<id>) pass through here; the renderer
  // resolves them (falling back safely if the package is missing).
  const effectiveThemeId =
    isRegisteredTheme(site.themeId) || site.themeId.startsWith('package:')
      ? site.themeId
      : getTheme(site.themeId).id;

  // In preview mode, canonical URLs still point at the site's primary domain.
  const origin = options.preview ? `https://${site.domain}` : `${proto}://${requestHost}`;

  return { site, settings: site.settings, effectiveThemeId, origin, preview: options.preview };
}

/** Current request path, stamped by middleware (for layout variants). */
export async function getRequestPath(): Promise<string> {
  const h = await headers();
  return h.get('x-pathname') ?? '/';
}

/**
 * Build the canonical origin for the current request.
 * Uses NEXT_PUBLIC_SITE_URL when set (recommended in production), otherwise
 * falls back to request headers.
 */
export async function getRequestOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  const h = await headers();
  const proto = h.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http';
  const host = h.get('x-forwarded-host')?.split(',')[0]?.trim() || h.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}
