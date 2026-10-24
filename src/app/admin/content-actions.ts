'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, UnauthenticatedError } from '@/lib/admin/require-admin';
import {
  createAuthor,
  createCategory,
  createPage,
  createPost,
  deleteAuthor,
  deleteCategory,
  deletePage,
  deletePost,
  setPageStatus,
  setPostStatus,
  updateAuthor,
  updateCategory,
  updatePage,
  updatePost,
  type PageInput,
  type PostInput,
} from '@/lib/admin/content-service';
/** Mirrors the shared action-state shape (type-only re-exports are not
 *  allowed out of "use server" modules). */
export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

/**
 * Content server actions. Same security model as the site actions: the
 * session is re-established server-side, authorization is enforced in the
 * service layer, and results are surfaced as typed action states.
 */

async function actorOrNull() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
}

/* ---------------------------------- pages --------------------------------- */

function pageInputFromForm(formData: FormData): PageInput {
  let blocks: unknown = [];
  try {
    blocks = JSON.parse(String(formData.get('blocks') ?? '[]'));
  } catch {
    blocks = { __invalid: true };
  }
  return {
    title: String(formData.get('title') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    eyebrow: String(formData.get('eyebrow') ?? ''),
    seoTitle: String(formData.get('seoTitle') ?? ''),
    seoDescription: String(formData.get('seoDescription') ?? ''),
    ogImage: String(formData.get('ogImage') ?? ''),
    isHomepage: formData.get('isHomepage') === 'on',
    blocks,
    status: formData.get('status') === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
  };
}

export async function createPageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await createPage(actor, siteId, pageInputFromForm(formData));
  if (result.ok) {
    revalidatePath(`/admin/sites/${siteId}/content/pages`);
    revalidatePath('/', 'layout');
    return { ok: true, message: `Page created as ${result.data.status.toLowerCase()}.` };
  }
  return result;
}

export async function updatePageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const pageId = Number(formData.get('pageId') ?? '0');
  const result = await updatePage(actor, siteId, pageId, pageInputFromForm(formData));
  if (result.ok) {
    revalidatePath(`/admin/sites/${siteId}/content/pages`);
    revalidatePath('/', 'layout');
    return { ok: true, message: `Page saved (${result.data.status.toLowerCase()}).` };
  }
  return result;
}

export async function setPageStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const status = String(formData.get('status') ?? '') as 'DRAFT' | 'PUBLISHED';
  if (status !== 'DRAFT' && status !== 'PUBLISHED') return { error: 'Invalid status.' };
  const result = await setPageStatus(actor, siteId, Number(formData.get('pageId') ?? '0'), status);
  if (result.ok) {
    revalidatePath(`/admin/sites/${siteId}/content/pages`);
    revalidatePath('/', 'layout');
    return { ok: true, message: status === 'PUBLISHED' ? 'Page published.' : 'Page unpublished.' };
  }
  return result;
}

export async function deletePageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await deletePage(actor, siteId, Number(formData.get('pageId') ?? '0'));
  if (result.ok) {
    revalidatePath(`/admin/sites/${siteId}/content/pages`);
    revalidatePath('/', 'layout');
    return { ok: true, message: `Page "${result.data.deleted}" deleted.` };
  }
  return result;
}

/* ---------------------------------- posts --------------------------------- */

function postInputFromForm(formData: FormData): PostInput {
  let body: unknown = [];
  try {
    body = JSON.parse(String(formData.get('body') ?? '[]'));
  } catch {
    body = { __invalid: true };
  }
  const categoryId = String(formData.get('categoryId') ?? '');
  return {
    title: String(formData.get('title') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    excerpt: String(formData.get('excerpt') ?? ''),
    body,
    coverImage: String(formData.get('coverImage') ?? ''),
    coverAlt: String(formData.get('coverAlt') ?? ''),
    categoryId: categoryId || undefined,
    authorId: String(formData.get('authorId') ?? ''),
    seoTitle: String(formData.get('seoTitle') ?? ''),
    seoDescription: String(formData.get('seoDescription') ?? ''),
    tags: String(formData.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    featured: formData.get('featured') === 'on',
    status: formData.get('status') === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
  };
}

export async function createPostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await createPost(actor, siteId, postInputFromForm(formData));
  if (result.ok) {
    revalidatePath(`/admin/sites/${siteId}/content/posts`);
    revalidatePath('/', 'layout');
    return { ok: true, message: `Post created as ${result.data.status.toLowerCase()}.` };
  }
  return result;
}

export async function updatePostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const postId = Number(formData.get('postId') ?? '0');
  const result = await updatePost(actor, siteId, postId, postInputFromForm(formData));
  if (result.ok) {
    revalidatePath(`/admin/sites/${siteId}/content/posts`);
    revalidatePath('/', 'layout');
    return { ok: true, message: `Post saved (${result.data.status.toLowerCase()}).` };
  }
  return result;
}

export async function setPostStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const status = String(formData.get('status') ?? '') as 'DRAFT' | 'PUBLISHED';
  if (status !== 'DRAFT' && status !== 'PUBLISHED') return { error: 'Invalid status.' };
  const result = await setPostStatus(actor, siteId, Number(formData.get('postId') ?? '0'), status);
  if (result.ok) {
    revalidatePath(`/admin/sites/${siteId}/content/posts`);
    revalidatePath('/', 'layout');
    return { ok: true, message: status === 'PUBLISHED' ? 'Post published.' : 'Post unpublished.' };
  }
  return result;
}

export async function deletePostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await deletePost(actor, siteId, Number(formData.get('postId') ?? '0'));
  if (result.ok) {
    revalidatePath(`/admin/sites/${siteId}/content/posts`);
    revalidatePath('/', 'layout');
    return { ok: true, message: `Post "${result.data.deleted}" deleted.` };
  }
  return result;
}

/* ------------------------- categories and authors ------------------------- */

export async function createCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await createCategory(actor, siteId, {
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    description: String(formData.get('description') ?? ''),
  });
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/content/categories`);
  return result;
}

export async function updateCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await updateCategory(actor, siteId, String(formData.get('categoryId') ?? ''), {
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
  });
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/content/categories`);
  return result;
}

export async function deleteCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await deleteCategory(actor, siteId, String(formData.get('categoryId') ?? ''));
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/content/categories`);
  return result;
}

export async function createAuthorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await createAuthor(actor, siteId, {
    name: String(formData.get('name') ?? ''),
    role: String(formData.get('role') ?? ''),
    bio: String(formData.get('bio') ?? ''),
  });
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/content/authors`);
  return result;
}

export async function updateAuthorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await updateAuthor(actor, siteId, String(formData.get('authorId') ?? ''), {
    name: String(formData.get('name') ?? ''),
    role: String(formData.get('role') ?? ''),
    bio: String(formData.get('bio') ?? ''),
  });
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/content/authors`);
  return result;
}

export async function deleteAuthorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await actorOrNull();
  if (!actor) return { error: 'Please sign in again.' };
  const siteId = String(formData.get('siteId') ?? '');
  const result = await deleteAuthor(actor, siteId, String(formData.get('authorId') ?? ''));
  if (result.ok) revalidatePath(`/admin/sites/${siteId}/content/authors`);
  return result;
}
