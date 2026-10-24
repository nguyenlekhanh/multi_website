'use server';

import { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { signIn, signOut } from '@/lib/admin/auth';
import { requireAdmin, UnauthenticatedError } from '@/lib/admin/require-admin';
import { LOGIN_RATE_LIMIT, checkRateLimit } from '@/lib/admin/rate-limit';
import {
  addDomain,
  createSite,
  removeDomain,
  setPrimaryDomain,
  setSiteStatus,
  setSiteTheme,
  updateSiteMeta,
  updateSiteSettings,
  type SiteSettingsInput,
} from '@/lib/admin/sites-service';
import type { ServiceResult } from '@/lib/admin/types';

/**
 * Admin server actions.
 *
 * Every action re-establishes the session server-side (requireAdmin) and
 * delegates authorization to the service layer — the UI is never trusted.
 * Login rate limiting uses the caller IP (x-forwarded-for aware).
 */

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

async function guard(): Promise<ReturnType<typeof requireAdmin> | null> {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
}

function toActionState<T>(result: ServiceResult<T>): ActionState {
  if (result.ok) return { ok: true, message: 'Saved.' };
  return { error: result.error };
}

/* --------------------------------- session -------------------------------- */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const ip = await clientIp();
  const limit = checkRateLimit(`${ip}:${email.slice(0, 120)}`, LOGIN_RATE_LIMIT);
  if (!limit.allowed) {
    return {
      error: `Too many sign-in attempts. Try again in about ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/admin' });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      // Generic message: never reveal whether the account exists.
      return { error: 'Invalid email or password.' };
    }
    throw error; // NEXT_REDIRECT from successful sign-in must propagate.
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/admin/login' });
}

/* ------------------------------ site mutations ---------------------------- */

export async function createSiteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await guard();
  if (!actor) return { error: 'Please sign in again.' };
  const result = await createSite(actor, {
    siteId: String(formData.get('siteId') ?? ''),
    name: String(formData.get('name') ?? ''),
    themeId: String(formData.get('themeId') ?? ''),
    primaryDomain: String(formData.get('primaryDomain') ?? '') || undefined,
    tagline: String(formData.get('tagline') ?? '') || undefined,
  });
  if (result.ok) {
    revalidatePath('/admin', 'layout');
    redirect(`/admin/sites/${result.data.siteId}`);
  }
  return toActionState(result);
}

export async function updateSiteMetaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await guard();
  if (!actor) return { error: 'Please sign in again.' };
  const result = await updateSiteMeta(actor, String(formData.get('siteId') ?? ''), {
    name: String(formData.get('name') ?? ''),
  });
  if (result.ok) revalidatePath('/admin', 'layout');
  return toActionState(result);
}

export async function setSiteStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await guard();
  if (!actor) return { error: 'Please sign in again.' };
  const status = String(formData.get('status') ?? '') as 'ACTIVE' | 'INACTIVE';
  if (status !== 'ACTIVE' && status !== 'INACTIVE') return { error: 'Invalid status.' };
  const result = await setSiteStatus(actor, String(formData.get('siteId') ?? ''), status);
  if (result.ok) revalidatePath('/admin', 'layout');
  return toActionState(result);
}

export async function setSiteThemeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await guard();
  if (!actor) return { error: 'Please sign in again.' };
  const result = await setSiteTheme(actor, String(formData.get('siteId') ?? ''), String(formData.get('themeId') ?? ''));
  if (result.ok) revalidatePath('/', 'layout');
  return toActionState(result);
}

/* ----------------------------- settings update ---------------------------- */

export async function updateSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await guard();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');

  const identitySection = formData.get('section_identity') !== null || formData.get('section_seo') !== null;
  void identitySection;

  const colorKeys = [
    'primary', 'primaryForeground', 'accent', 'background', 'foreground',
    'muted', 'mutedForeground', 'border', 'dark', 'darkForeground',
  ] as const;
  const colors: Record<string, string> = {};
  for (const key of colorKeys) {
    const value = formData.get(`color_${key}`);
    if (typeof value === 'string' && value.trim() !== '') colors[key] = value.trim();
  }

  const parseNav = (prefix: string) => {
    const entries: { label: string; href: string }[] = [];
    for (let i = 0; i < 12; i += 1) {
      const label = String(formData.get(`${prefix}_label_${i}`) ?? '').trim();
      const href = String(formData.get(`${prefix}_href_${i}`) ?? '').trim();
      if (label || href) entries.push({ label, href });
    }
    return entries;
  };

  const input: SiteSettingsInput = {
    name: String(formData.get('name') ?? '') || undefined,
    identity: {
      tagline: String(formData.get('tagline') ?? ''),
      logoText: String(formData.get('logoText') ?? ''),
      logoInitials: String(formData.get('logoInitials') ?? ''),
      logoUrl: String(formData.get('logoUrl') ?? ''),
      faviconUrl: String(formData.get('faviconUrl') ?? ''),
    },
    colors: Object.keys(colors).length > 0 ? colors : undefined,
    nav: parseNav('nav'),
    footerNav: parseNav('footer'),
    seo: {
      defaultTitle: String(formData.get('seoDefaultTitle') ?? ''),
      titleTemplate: String(formData.get('seoTitleTemplate') ?? ''),
      description: String(formData.get('seoDescription') ?? ''),
      keywords: String(formData.get('seoKeywords') ?? ''),
      socialImage: String(formData.get('seoSocialImage') ?? ''),
      twitterHandle: String(formData.get('seoTwitterHandle') ?? ''),
    },
    typography: {
      headingFont: String(formData.get('headingFont') ?? 'system'),
      bodyFont: String(formData.get('bodyFont') ?? 'system'),
    },
  };

  const result = await updateSiteSettings(actor, siteId, input);
  if (result.ok) {
    revalidatePath('/', 'layout');
    revalidatePath(`/admin/sites/${siteId}/settings`);
    return { ok: true, message: 'Settings saved and applied to the website.' };
  }
  return toActionState(result);
}

/* -------------------------------- domains --------------------------------- */

export async function addDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await guard();
  if (!actor) return { error: 'Please sign in again.' };
  const result = await addDomain(actor, String(formData.get('siteId') ?? ''), String(formData.get('host') ?? ''));
  if (result.ok) revalidatePath(`/admin/sites/${formData.get('siteId')}/domains`);
  return toActionState(result);
}

export async function setPrimaryDomainAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await guard();
  if (!actor) return { error: 'Please sign in again.' };
  const result = await setPrimaryDomain(actor, String(formData.get('siteId') ?? ''), Number(formData.get('domainId') ?? '0'));
  if (result.ok) revalidatePath(`/admin/sites/${formData.get('siteId')}/domains`);
  return toActionState(result);
}

export async function removeDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await guard();
  if (!actor) return { error: 'Please sign in again.' };
  const result = await removeDomain(actor, String(formData.get('siteId') ?? ''), Number(formData.get('domainId') ?? '0'));
  if (result.ok) revalidatePath(`/admin/sites/${formData.get('siteId')}/domains`);
  return toActionState(result);
}
