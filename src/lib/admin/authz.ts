import { getPrisma } from '@/platform/data/prisma';
import { isDataUnavailableError, DataUnavailableError } from '@/platform/data/errors';
import type { AdminSessionUser } from './types';

/**
 * Centralized authorization boundary.
 *
 * Every admin service call resolves the caller's scope here — SUPER_ADMINs
 * implicitly access everything; SITE_ADMINs only their explicit
 * site_memberships. The caller-supplied site id is never proof of permission:
 * access is always re-checked against the database, which blocks horizontal
 * privilege escalation (a forged/foreign site id resolves to "no grant").
 */

export class ForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export type SiteAccess = { siteId: string; role: 'SUPER_ADMIN' | 'SITE_ADMIN' };

/**
 * Resolve the caller's access to one site. Returns the effective role for
 * the site, or null when the caller has no access. Also verifies the site
 * exists — a valid grant to a deleted site grants nothing.
 */
export async function resolveSiteAccess(
  actor: AdminSessionUser,
  siteId: string,
): Promise<SiteAccess | null> {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(siteId)) return null;
  try {
    const site = await getPrisma().site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        status: true,
        memberships: actor.role === 'SUPER_ADMIN' ? undefined : { where: { userId: actor.id }, select: { userId: true } },
      },
    });
    if (!site) return null;
    if (actor.role === 'SUPER_ADMIN') return { siteId: site.id, role: 'SUPER_ADMIN' };
    // SITE_ADMIN: explicit membership required (checked in SQL above).
    const granted = (site as { memberships?: { userId: string }[] }).memberships;
    return granted && granted.length > 0 ? { siteId: site.id, role: 'SITE_ADMIN' } : null;
  } catch (error) {
    if (isDataUnavailableError(error)) throw error;
    throw new DataUnavailableError(`Authorization check failed for site "${siteId}".`, { cause: error });
  }
}

/** Resolve every site id the actor may access (DB-side scoping). */
export async function resolveAccessibleSiteIds(actor: AdminSessionUser): Promise<string[] | null> {
  if (actor.role === 'SUPER_ADMIN') return null; // null = unrestricted
  const grants = await getPrisma().siteMembership.findMany({
    where: { userId: actor.id },
    select: { siteId: true },
  });
  return grants.map((g) => g.siteId);
}

/** Guard for actions that only SUPER_ADMINs may perform. */
export function assertSuperAdmin(actor: AdminSessionUser): void {
  if (actor.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Only Super Admins can perform this action.');
  }
}

/** Guard for per-site operations; throws ForbiddenError when no access. */
export async function assertSiteAccess(actor: AdminSessionUser, siteId: string): Promise<SiteAccess> {
  const access = await resolveSiteAccess(actor, siteId);
  if (!access) throw new ForbiddenError('You do not have access to this website.');
  return access;
}
