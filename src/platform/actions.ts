'use server';

import { revalidatePath } from 'next/cache';
import { db, isDataUnavailableError } from './data';
import { isRegisteredTheme } from './registry';

/**
 * Dev-only server actions backing the floating preview bar.
 *
 * Theme switching mutates the active data source's site configuration:
 * with seed data it stays in the in-memory runtime store; with PostgreSQL it
 * performs a real, site-scoped UPDATE of the sites.theme_id column. Either
 * way it is disabled in production builds — it is never a public
 * configuration API. A future admin dashboard adds authentication on top of
 * the same persistence path.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function switchSiteTheme(siteId: string, themeId: string): Promise<ActionResult> {
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, error: 'Theme switching is a development-only control.' };
  }
  if (!isRegisteredTheme(themeId)) {
    return { ok: false, error: `Unknown theme "${themeId}".` };
  }
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(siteId)) {
    return { ok: false, error: 'Invalid site id.' };
  }
  try {
    const site = await db.getSite(siteId);
    if (!site) {
      return { ok: false, error: `Unknown site "${siteId}".` };
    }
    await db.updateActiveTheme(siteId, themeId);
  } catch (error) {
    if (isDataUnavailableError(error)) {
      return { ok: false, error: 'Data source unavailable — cannot switch themes right now.' };
    }
    throw error;
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
