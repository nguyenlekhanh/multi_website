'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, UnauthenticatedError } from '@/lib/admin/require-admin';
import {
  installThemePackage,
  rollbackThemePackage,
  uninstallThemePackage,
} from '@/lib/theme-package/store';
/** Mirrors the shared action-state shape (type-only re-exports are not
 *  allowed out of "use server" modules). */
export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

async function actorOrNull() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
}

/** Upload a theme ZIP (Super Admin). Size is bounded by the action body limit + validator. */
export async function uploadThemeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  if (actor.role !== 'SUPER_ADMIN') {
    return { error: 'Only Super Admins can install theme packages.' };
  }
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a theme .zip file first.' };
  }
  if (!file.name.endsWith('.zip')) {
    return { error: 'Only .zip theme packages are accepted.' };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await installThemePackage(actor, bytes);
  if (result.ok) {
    revalidatePath('/admin/themes');
    revalidatePath('/admin', 'layout');
    return {
      ok: true,
      message: `Installed "${result.themeId}" v${result.version}${result.updated ? ' (update; previous version kept for rollback)' : ''}. It is now selectable in every website\u2019s theme picker.`,
    };
  }
  const details = (result.errors ?? []).slice(0, 6).map((e) => `${e.path}: ${e.message}`).join(' · ');
  return { error: details ? `${result.error} ${details}` : result.error };
}

export async function rollbackThemeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const result = await rollbackThemePackage(actor, String(formData.get('themeId') ?? ''), String(formData.get('version') ?? ''));
  if (result.ok) {
    revalidatePath('/admin/themes');
    revalidatePath('/admin', 'layout');
    return { ok: true, message: `Rolled back to v${result.version}.` };
  }
  return { error: result.error };
}

export async function uninstallThemeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const result = await uninstallThemePackage(actor, String(formData.get('themeId') ?? ''));
  if (result.ok) {
    revalidatePath('/admin/themes');
    revalidatePath('/admin', 'layout');
    return { ok: true, message: `Uninstalled "${result.themeId}".` };
  }
  return { error: result.error };
}
