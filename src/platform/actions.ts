'use server';

import { revalidatePath } from 'next/cache';
import { db, resolveDataSourceMode } from './data';
import { isDataUnavailableError } from './data/errors';
import { isRegisteredTheme } from './registry';

/**
 * Dev-only server actions backing the floating preview bar.
 *
 * In seed mode the theme override lives in the in-memory runtime store. In
 * PostgreSQL mode the real, persistent theme change path is the authenticated
 * admin dashboard (with audit logging) — the dev switcher intentionally
 * refuses there so it can never act as an alternative production admin
 * interface. Everything here is disabled in production builds.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function switchSiteTheme(siteId: string, themeId: string): Promise<ActionResult> {
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, error: 'Theme switching is a development-only control.' };
  }
  if (resolveDataSourceMode() === 'postgres') {
    return {
      ok: false,
      error: 'This site runs on PostgreSQL — manage its theme in the admin dashboard (/admin).',
    };
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
