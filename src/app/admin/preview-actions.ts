'use server';

import { redirect } from 'next/navigation';
import { requireAdmin, UnauthenticatedError } from '@/lib/admin/require-admin';
import { PACKAGE_LIMITS } from '@/lib/theme-package/spec';
import { readZip } from '@/lib/theme-package/zip';
import { putPreviewPackage } from '@/lib/theme-package/preview/store';

/**
 * Preview Lab upload action.
 *
 * Validates an uploaded ZIP with the SAME validator the installer uses, then
 * stages the package in the lab's in-memory store. Nothing is written to the
 * database and no site's active theme is touched — the response redirects to
 * a token-scoped preview URL that only authenticated admins can open.
 */

/** Mirrors the shared action-state shape (type-only re-exports are not
 *  allowed out of "use server" modules). */
export interface PreviewActionState {
  ok?: boolean;
  error?: string;
  errors?: { path: string; field?: string; message: string }[];
}

async function actorOrNull() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
}

export async function previewUploadAction(
  _prev: PreviewActionState,
  formData: FormData,
): Promise<PreviewActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a theme .zip file first.' };
  }
  if (!file.name.endsWith('.zip')) {
    return { error: 'Only .zip theme packages are accepted.' };
  }
  if (file.size > PACKAGE_LIMITS.maxCompressedBytes) {
    return { error: `ZIP exceeds the ${Math.round(PACKAGE_LIMITS.maxCompressedBytes / 1024 / 1024)} MB package limit.` };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const zip = readZip(bytes);
  if (!zip.ok) {
    return { error: `Malformed ZIP archive: ${zip.error}` };
  }

  const files = new Map(zip.entries.map((entry) => [entry.name, entry.data]));
  const staged = putPreviewPackage(files);
  if (!staged.ok) {
    return { error: 'The package failed validation and was not staged.', errors: staged.errors.slice(0, 12) };
  }

  // Redirect (not in a try/catch — NEXT_REDIRECT must propagate).
  redirect(`/admin/themes/lab/preview/u_${staged.token}`);
}
