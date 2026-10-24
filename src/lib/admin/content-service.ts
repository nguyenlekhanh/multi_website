import { Prisma } from '@prisma/client';
import {
  validateBlocks,
  validateParagraphs,
  validateSafeReference,
  ValidationError,
} from '@/platform/data/validation';
import { getPrisma } from '@/platform/data/prisma';
import { isDataUnavailableError } from '@/platform/data/errors';
import { assertSiteAccess } from './authz';
import { writeAudit } from './audit';
import { fail, ok, type ServiceResult } from './types';
import type { AdminSessionUser } from './types';
import { isReservedSlug, isValidSlug, slugify } from './slug';
import type { Block } from '@/platform/types';

/**
 * Content service — pages, posts, categories, authors, and media listing.
 *
 * Same rules as sites-service: the actor is authenticated, authorization is
 * enforced here (assertSiteAccess on every call), payloads are validated
 * server-side against the platform's typed models, writable fields are
 * selected explicitly (no mass assignment), every relation is checked for
 * site scope, and audit entries are written inside the mutation transaction
 * so they only ever describe committed operations.
 *
 * Public rendering never imports this module; the read-only DataAdapter
 * already filters DRAFT content out of public queries.
 */

const PAGE_SELECT = {
  id: true,
  siteId: true,
  slug: true,
  title: true,
  eyebrow: true,
  seoTitle: true,
  seoDescription: true,
  ogImage: true,
  isHomepage: true,
  status: true,
  blocks: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const POST_SELECT = {
  id: true,
  siteId: true,
  slug: true,
  title: true,
  excerpt: true,
  body: true,
  coverImage: true,
  coverAlt: true,
  categoryId: true,
  authorId: true,
  seoTitle: true,
  seoDescription: true,
  status: true,
  featured: true,
  readingMinutes: true,
  tags: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/* --------------------------------- slugs ---------------------------------- */

export function suggestSlug(title: string): string {
  return slugify(title ?? '');
}

function validateSlugInput(slug: string, field = 'slug'): string {
  const value = (slug ?? '').trim().toLowerCase();
  if (!isValidSlug(value)) {
    throw new ValidationError(
      `${field} must be 1-80 characters: lowercase letters, digits, and single hyphens.`,
    );
  }
  if (isReservedSlug(value)) {
    throw new ValidationError(`"${value}" is a reserved slug and cannot be used.`);
  }
  return value;
}

/** Resolve an image reference: empty → null, media path owned by the site, or https URL. */
async function resolveImageReference(
  siteId: string,
  input: string | null | undefined,
  field: string,
): Promise<string | null> {
  const raw = (input ?? '').trim();
  if (raw === '') return null; // empty string means "no image"
  const value = validateSafeReference(raw, field) ?? null;
  if (value === null) return null;
  if (/^https:\/\//.test(value)) return value;
  // Site-relative path: must exist in this site's media library.
  const media = await getPrisma().media.findUnique({
    where: { siteId_src: { siteId, src: value } },
    select: { id: true },
  });
  if (!media) {
    throw new ValidationError(
      `${field} references "${value}", which is not in this website's media library. Add it there or use an https:// URL.`,
    );
  }
  return value;
}

function handleContentError(error: unknown, context: string): ServiceResult<never> {
  if (error instanceof ValidationError) return fail(error.message, 'VALIDATION');
  if (isDataUnavailableError(error)) {
    return fail('The database is temporarily unavailable. Try again shortly.', 'UNAVAILABLE');
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return fail(
      'That slug is already used by other content on this website. Slugs must be unique per site.',
      'CONFLICT',
    );
  }
  if (error instanceof Error && error.name === 'ForbiddenError') {
    return fail(error.message, 'FORBIDDEN');
  }
  console.error(`[admin] failed to ${context}:`, error instanceof Error ? error.message : error);
  return fail(`Could not ${context}. Please try again.`, 'UNAVAILABLE');
}

/* ---------------------------------- pages --------------------------------- */

export interface AdminPageListItem {
  id: number;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  isHomepage: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

export interface AdminPageDetail extends AdminPageListItem {
  createdAt: string;
  eyebrow?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  blocks: Block[];
}

export async function listPagesForAdmin(
  actor: AdminSessionUser,
  siteId: string,
  options?: { search?: string; status?: 'DRAFT' | 'PUBLISHED' | 'ALL'; page?: number; pageSize?: number },
): Promise<ServiceResult<{ items: AdminPageListItem[]; total: number; page: number; pageSize: number }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const pageSize = Math.min(Math.max(options?.pageSize ?? 20, 1), 50);
    const page = Math.max(options?.page ?? 1, 1);
    const search = options?.search?.trim();
    const where = {
      siteId,
      ...(options?.status && options.status !== 'ALL' ? { status: options.status } : {}),
      ...(search
        ? { OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ] }
        : {}),
    };
    const [rows, total] = await Promise.all([
      getPrisma().page.findMany({
        where,
        select: { ...PAGE_SELECT, blocks: false },
        orderBy: [{ isHomepage: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().page.count({ where }),
    ]);
    return ok({
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        status: r.status,
        isHomepage: r.isHomepage,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleContentError(error, 'list pages');
  }
}

export async function getPageForAdmin(
  actor: AdminSessionUser,
  siteId: string,
  pageId: number,
): Promise<ServiceResult<AdminPageDetail>> {
  try {
    await assertSiteAccess(actor, siteId);
    const row = await getPrisma().page.findFirst({
      where: { id: pageId, siteId },
      select: PAGE_SELECT,
    });
    if (!row) return fail('Page not found on this website.', 'NOT_FOUND');
    return ok({
      id: row.id,
      siteId: row.siteId,
      slug: row.slug,
      title: row.title,
      eyebrow: row.eyebrow ?? undefined,
      seoTitle: row.seoTitle ?? undefined,
      seoDescription: row.seoDescription ?? undefined,
      ogImage: row.ogImage ?? undefined,
      isHomepage: row.isHomepage,
      status: row.status,
      blocks: validateBlocks(row.blocks ?? [], `page ${pageId} blocks`),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleContentError(error, 'load page');
  }
}

export interface PageInput {
  title: string;
  slug: string;
  eyebrow?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  isHomepage?: boolean;
  blocks: unknown;
  /** Explicit workflow control; defaults to DRAFT for new pages. */
  status?: 'DRAFT' | 'PUBLISHED';
}

export async function createPage(
  actor: AdminSessionUser,
  siteId: string,
  input: PageInput,
): Promise<ServiceResult<{ id: number; slug: string; status: 'DRAFT' | 'PUBLISHED' }>> {
  try {
    await assertSiteAccess(actor, siteId);

    const title = (input.title ?? '').trim();
    if (title.length < 1 || title.length > 200) {
      return fail('Title must be 1-200 characters.', 'VALIDATION');
    }
    const slug = validateSlugInput(input.slug ?? suggestSlug(title));
    if (!slug) return fail('Slug is required.', 'VALIDATION');
    const blocks = validateBlocks(input.blocks ?? [], 'blocks');

    const ogImage = await resolveImageReference(siteId, input.ogImage, 'ogImage');
    const status: 'DRAFT' | 'PUBLISHED' = input.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    if (status === 'PUBLISHED' && blocks.length === 0) {
      return fail('Add at least one content block before publishing.', 'VALIDATION');
    }

    const duplicate = await getPrisma().page.findUnique({
      where: { siteId_slug: { siteId, slug } },
      select: { id: true },
    });
    if (duplicate) {
      return fail(`A page with the slug "${slug}" already exists on this website.`, 'CONFLICT');
    }

    const created = await getPrisma().$transaction(async (tx) => {
      if (input.isHomepage) {
        await tx.page.updateMany({ where: { siteId, isHomepage: true }, data: { isHomepage: false } });
      }
      const row = await tx.page.create({
        data: {
          siteId,
          slug,
          title,
          eyebrow: input.eyebrow?.trim() || null,
          seoTitle: input.seoTitle?.trim() || null,
          seoDescription: input.seoDescription?.trim() || null,
          ogImage,
          isHomepage: input.isHomepage ?? false,
          status,
          blocks: blocks as never,
          publishedAt: status === 'PUBLISHED' ? new Date() : null,
        },
        select: { id: true },
      });
      await writeAudit(tx, {
        actor,
        action: 'page.create',
        targetSiteId: siteId,
        summary: `Created ${status === 'PUBLISHED' ? 'and published' : 'draft'} page "${title}" (/${slug}).`,
      });
      return row;
    });

    return ok({ id: created.id, slug, status });
  } catch (error) {
    return handleContentError(error, 'create page');
  }
}

export async function updatePage(
  actor: AdminSessionUser,
  siteId: string,
  pageId: number,
  input: PageInput,
): Promise<ServiceResult<{ id: number; slug: string; status: 'DRAFT' | 'PUBLISHED' }>> {
  try {
    await assertSiteAccess(actor, siteId);

    const existing = await getPrisma().page.findFirst({
      where: { id: pageId, siteId },
      select: { id: true, slug: true, status: true, isHomepage: true },
    });
    if (!existing) return fail('Page not found on this website.', 'NOT_FOUND');

    const title = (input.title ?? '').trim();
    if (title.length < 1 || title.length > 200) {
      return fail('Title must be 1-200 characters.', 'VALIDATION');
    }
    // Slugs never change implicitly: the submitted slug is used verbatim, so
    // editing a title alone preserves the public URL.
    const slug = validateSlugInput(input.slug ?? existing.slug);
    const blocks = validateBlocks(input.blocks ?? [], 'blocks');
    const ogImage = await resolveImageReference(siteId, input.ogImage, 'ogImage');

    const status = input.status ?? existing.status;
    if (status === 'PUBLISHED' && blocks.length === 0) {
      return fail('Add at least one content block before publishing.', 'VALIDATION');
    }

    if (slug !== existing.slug) {
      const taken = await getPrisma().page.findUnique({
        where: { siteId_slug: { siteId, slug } },
        select: { id: true },
      });
      if (taken && taken.id !== pageId) {
        return fail(`A page with the slug "${slug}" already exists on this website.`, 'CONFLICT');
      }
    }

    const updated = await getPrisma().$transaction(async (tx) => {
      if (input.isHomepage && !existing.isHomepage) {
        await tx.page.updateMany({ where: { siteId, isHomepage: true }, data: { isHomepage: false } });
      }
      const row = await tx.page.update({
        where: { id: pageId },
        data: {
          title,
          slug,
          eyebrow: input.eyebrow?.trim() || null,
          seoTitle: input.seoTitle?.trim() || null,
          seoDescription: input.seoDescription?.trim() || null,
          ogImage,
          isHomepage: input.isHomepage ?? existing.isHomepage,
          status,
          blocks: blocks as never,
          // First publication stamps publishedAt; it is not reset later.
          // First publication stamps publishedAt; later edits never reset it.
          publishedAt:
            status === 'PUBLISHED' && existing.status === 'DRAFT' ? new Date() : undefined,
        },
        select: { id: true, slug: true, status: true },
      });
      await writeAudit(tx, {
        actor,
        action: 'page.update',
        targetSiteId: siteId,
        summary: `Updated page "${title}" (/${slug})${status !== existing.status ? ` — status ${existing.status} → ${status}` : ''}.`,
      });
      return row;
    });

    return ok({ id: updated.id, slug: updated.slug, status: updated.status });
  } catch (error) {
    return handleContentError(error, 'update page');
  }
}

export async function setPageStatus(
  actor: AdminSessionUser,
  siteId: string,
  pageId: number,
  status: 'DRAFT' | 'PUBLISHED',
): Promise<ServiceResult<{ status: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const result = await getPrisma().$transaction(async (tx) => {
      const existing = await tx.page.findFirst({
        where: { id: pageId, siteId },
        select: { id: true, title: true, slug: true, status: true, blocks: true },
      });
      if (!existing) return null;
      if (status === 'PUBLISHED') {
        const count = Array.isArray(existing.blocks) ? existing.blocks.length : 0;
        if (count === 0) throw new ValidationError('Add at least one content block before publishing.');
      }
      const row = await tx.page.update({
        where: { id: pageId },
        data: {
          status,
          publishedAt:
            status === 'PUBLISHED' && existing.status === 'DRAFT' ? new Date() : undefined,
        },
        select: { status: true },
      });
      await writeAudit(tx, {
        actor,
        action: status === 'PUBLISHED' ? 'page.publish' : 'page.unpublish',
        targetSiteId: siteId,
        summary: `${status === 'PUBLISHED' ? 'Published' : 'Unpublished'} page "${existing.title}" (/${existing.slug}).`,
      });
      return row;
    });
    if (!result) return fail('Page not found on this website.', 'NOT_FOUND');
    return ok({ status: result.status });
  } catch (error) {
    return handleContentError(error, 'change page status');
  }
}

export async function deletePage(
  actor: AdminSessionUser,
  siteId: string,
  pageId: number,
): Promise<ServiceResult<{ deleted: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const result = await getPrisma().$transaction(async (tx) => {
      const existing = await tx.page.findFirst({
        where: { id: pageId, siteId },
        select: { id: true, title: true, slug: true, isHomepage: true },
      });
      if (!existing) return null;
      if (existing.isHomepage) {
        throw new ValidationError(
          'This page is the homepage. Assign another page as the homepage before deleting it.',
        );
      }
      await tx.page.delete({ where: { id: pageId } });
      await writeAudit(tx, {
        actor,
        action: 'page.delete',
        targetSiteId: siteId,
        summary: `Deleted page "${existing.title}" (/${existing.slug}).`,
      });
      return existing;
    });
    if (!result) return fail('Page not found on this website.', 'NOT_FOUND');
    return ok({ deleted: result.title });
  } catch (error) {
    return handleContentError(error, 'delete page');
  }
}

/* ---------------------------------- posts --------------------------------- */

export interface AdminPostListItem {
  id: number;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  featured: boolean;
  categoryName: string | null;
  authorName: string;
  publishedAt: string | null;
  updatedAt: string;
}

export interface AdminPostDetail extends AdminPostListItem {
  excerpt: string;
  body: string[];
  coverImage?: string;
  coverAlt?: string;
  categoryId?: string;
  authorId: string;
  seoTitle?: string;
  seoDescription?: string;
  tags: string[];
}

export async function listPostsForAdmin(
  actor: AdminSessionUser,
  siteId: string,
  options?: {
    search?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ALL';
    categorySlug?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<ServiceResult<{ items: AdminPostListItem[]; total: number; page: number; pageSize: number }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const pageSize = Math.min(Math.max(options?.pageSize ?? 20, 1), 50);
    const page = Math.max(options?.page ?? 1, 1);
    const search = options?.search?.trim();
    const where = {
      siteId,
      ...(options?.status && options.status !== 'ALL' ? { status: options.status } : {}),
      ...(options?.categorySlug ? { category: { slug: options.categorySlug, siteId } } : {}),
      ...(search
        ? { OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ] }
        : {}),
    };
    const [rows, total] = await Promise.all([
      getPrisma().post.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          featured: true,
          publishedAt: true,
          updatedAt: true,
          category: { select: { name: true } },
          author: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().post.count({ where }),
    ]);
    return ok({
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        status: r.status,
        featured: r.featured,
        categoryName: r.category?.name ?? null,
        authorName: r.author.name,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleContentError(error, 'list posts');
  }
}

export async function getPostForAdmin(
  actor: AdminSessionUser,
  siteId: string,
  postId: number,
): Promise<ServiceResult<AdminPostDetail>> {
  try {
    await assertSiteAccess(actor, siteId);
    const row = await getPrisma().post.findFirst({
      where: { id: postId, siteId },
      select: { ...POST_SELECT, category: { select: { name: true } }, author: { select: { name: true } } },
    });
    if (!row) return fail('Post not found on this website.', 'NOT_FOUND');
    return ok({
      id: row.id,
      siteId: row.siteId,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      body: validateParagraphs(row.body ?? [], `post ${postId} body`),
      categoryName: row.category?.name ?? null,
      authorName: row.author.name,
      coverImage: row.coverImage ?? undefined,
      coverAlt: row.coverAlt ?? undefined,
      categoryId: row.categoryId ?? undefined,
      authorId: row.authorId,
      seoTitle: row.seoTitle ?? undefined,
      seoDescription: row.seoDescription ?? undefined,
      status: row.status,
      featured: row.featured,
      tags: row.tags,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleContentError(error, 'load post');
  }
}

export interface PostInput {
  title: string;
  slug: string;
  excerpt?: string;
  body?: unknown;
  coverImage?: string;
  coverAlt?: string;
  categoryId?: string;
  authorId: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  featured?: boolean;
  status?: 'DRAFT' | 'PUBLISHED';
}

export async function createPost(
  actor: AdminSessionUser,
  siteId: string,
  input: PostInput,
): Promise<ServiceResult<{ id: number; slug: string; status: 'DRAFT' | 'PUBLISHED' }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const scoped = await validatePostInput(siteId, input, null);

    const created = await getPrisma().$transaction(async (tx) => {
      const row = await tx.post.create({
        data: {
          siteId,
          slug: scoped.slug,
          title: scoped.title,
          excerpt: scoped.excerpt,
          body: scoped.body as never,
          coverImage: scoped.coverImage,
          coverAlt: scoped.coverAlt,
          categoryId: scoped.categoryId,
          authorId: scoped.authorId,
          seoTitle: scoped.seoTitle,
          seoDescription: scoped.seoDescription,
          tags: scoped.tags,
          featured: scoped.featured,
          status: scoped.status,
          publishedAt: scoped.status === 'PUBLISHED' ? new Date() : null,
        },
        select: { id: true },
      });
      await writeAudit(tx, {
        actor,
        action: 'post.create',
        targetSiteId: siteId,
        summary: `Created ${scoped.status === 'PUBLISHED' ? 'and published' : 'draft'} post "${scoped.title}" (/posts/${scoped.slug}).`,
      });
      return row;
    });
    return ok({ id: created.id, slug: scoped.slug, status: scoped.status });
  } catch (error) {
    return handleContentError(error, 'create post');
  }
}

export async function updatePost(
  actor: AdminSessionUser,
  siteId: string,
  postId: number,
  input: PostInput,
): Promise<ServiceResult<{ id: number; slug: string; status: 'DRAFT' | 'PUBLISHED' }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const existing = await getPrisma().post.findFirst({
      where: { id: postId, siteId },
      select: { id: true, slug: true, status: true, publishedAt: true },
    });
    if (!existing) return fail('Post not found on this website.', 'NOT_FOUND');
    const scoped = await validatePostInput(siteId, input, existing.slug);

    const updated = await getPrisma().$transaction(async (tx) => {
      const row = await tx.post.update({
        where: { id: postId },
        data: {
          slug: scoped.slug,
          title: scoped.title,
          excerpt: scoped.excerpt,
          body: scoped.body as never,
          coverImage: scoped.coverImage,
          coverAlt: scoped.coverAlt,
          categoryId: scoped.categoryId,
          authorId: scoped.authorId,
          seoTitle: scoped.seoTitle,
          seoDescription: scoped.seoDescription,
          tags: scoped.tags,
          featured: scoped.featured,
          status: scoped.status,
          publishedAt:
            scoped.status === 'PUBLISHED'
              ? (existing.status === 'DRAFT' ? new Date() : existing.publishedAt ?? new Date())
              : existing.publishedAt,
        },
        select: { id: true, slug: true, status: true },
      });
      await writeAudit(tx, {
        actor,
        action: 'post.update',
        targetSiteId: siteId,
        summary: `Updated post "${scoped.title}" (/posts/${scoped.slug})${scoped.status !== existing.status ? ` — status ${existing.status} → ${scoped.status}` : ''}.`,
      });
      return row;
    });
    return ok({ id: updated.id, slug: updated.slug, status: updated.status });
  } catch (error) {
    return handleContentError(error, 'update post');
  }
}

export async function setPostStatus(
  actor: AdminSessionUser,
  siteId: string,
  postId: number,
  status: 'DRAFT' | 'PUBLISHED',
): Promise<ServiceResult<{ status: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const result = await getPrisma().$transaction(async (tx) => {
      const existing = await tx.post.findFirst({
        where: { id: postId, siteId },
        select: { id: true, title: true, slug: true, status: true, publishedAt: true, body: true },
      });
      if (!existing) return null;
      if (status === 'PUBLISHED') {
        const paragraphs = Array.isArray(existing.body) ? existing.body.length : 0;
        if (paragraphs === 0) {
          throw new ValidationError('Add at least one paragraph before publishing.');
        }
      }
      const row = await tx.post.update({
        where: { id: postId },
        data: {
          status,
          // Stamp on first publish; unpublishing keeps the original date.
          publishedAt:
            status === 'PUBLISHED' && existing.status === 'DRAFT' ? new Date() : undefined,
        },
        select: { status: true },
      });
      await writeAudit(tx, {
        actor,
        action: status === 'PUBLISHED' ? 'post.publish' : 'post.unpublish',
        targetSiteId: siteId,
        summary: `${status === 'PUBLISHED' ? 'Published' : 'Unpublished'} post "${existing.title}" (/posts/${existing.slug}).`,
      });
      return row;
    });
    if (!result) return fail('Post not found on this website.', 'NOT_FOUND');
    return ok({ status: result.status });
  } catch (error) {
    return handleContentError(error, 'change post status');
  }
}

export async function deletePost(
  actor: AdminSessionUser,
  siteId: string,
  postId: number,
): Promise<ServiceResult<{ deleted: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const result = await getPrisma().$transaction(async (tx) => {
      const existing = await tx.post.findFirst({
        where: { id: postId, siteId },
        select: { id: true, title: true, slug: true },
      });
      if (!existing) return null;
      await tx.post.delete({ where: { id: postId } });
      await writeAudit(tx, {
        actor,
        action: 'post.delete',
        targetSiteId: siteId,
        summary: `Deleted post "${existing.title}" (/posts/${existing.slug}).`,
      });
      return existing;
    });
    if (!result) return fail('Post not found on this website.', 'NOT_FOUND');
    return ok({ deleted: result.title });
  } catch (error) {
    return handleContentError(error, 'delete post');
  }
}

/** Shared post payload validation + site-scoped relation resolution. */
async function validatePostInput(
  siteId: string,
  input: PostInput,
  existingSlug: string | null,
) {
  const title = (input.title ?? '').trim();
  if (title.length < 1 || title.length > 200) {
    throw new ValidationError('Title must be 1-200 characters.');
  }
  const slug = validateSlugInput((input.slug ?? '').trim() || existingSlug || suggestSlug(title));
  if (!existingSlug || slug !== existingSlug) {
    const taken = await getPrisma().post.findUnique({
      where: { siteId_slug: { siteId, slug } },
      select: { id: true },
    });
    if (taken) {
      throw new ValidationError(
        `A post with the slug "${slug}" already exists on this website.`,
      );
    }
  }

  const excerpt = (input.excerpt ?? '').trim().slice(0, 500);
  const body = validateParagraphs(input.body ?? [], 'body');
  const status: 'DRAFT' | 'PUBLISHED' = input.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
  if (status === 'PUBLISHED' && body.length === 0) {
    throw new ValidationError('Add at least one paragraph before publishing.');
  }

  // Site-scoped relations: ids from another site are rejected outright.
  const author = await getPrisma().author.findFirst({
    where: { id: input.authorId ?? '', siteId },
    select: { id: true },
  });
  if (!author) {
    throw new ValidationError('Select an author that belongs to this website.');
  }
  let categoryId: string | null = null;
  if (input.categoryId) {
    const category = await getPrisma().category.findFirst({
      where: { id: input.categoryId, siteId },
      select: { id: true },
    });
    if (!category) {
      throw new ValidationError('The selected category does not belong to this website.');
    }
    categoryId = input.categoryId;
  }

  const coverImage = await resolveImageReference(siteId, input.coverImage, 'coverImage');

  const tags = (input.tags ?? [])
    .map((t) => (t ?? '').trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((t) => t.slice(0, 40));

  return {
    title,
    slug,
    excerpt,
    body,
    coverImage,
    coverAlt: (input.coverAlt ?? '').trim().slice(0, 300) || null,
    categoryId,
    authorId: input.authorId,
    seoTitle: (input.seoTitle ?? '').trim().slice(0, 200) || null,
    seoDescription: (input.seoDescription ?? '').trim().slice(0, 300) || null,
    tags,
    featured: input.featured ?? false,
    status,
  };
}

/* ------------------------------- categories ------------------------------- */

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  postCount: number;
}

export async function listCategoriesForAdmin(
  actor: AdminSessionUser,
  siteId: string,
): Promise<ServiceResult<AdminCategory[]>> {
  try {
    await assertSiteAccess(actor, siteId);
    const categories = await getPrisma().category.findMany({
      where: { siteId },
      include: { _count: { select: { posts: true } } },
      orderBy: { name: 'asc' },
    });
    return ok(
      categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description ?? undefined,
        postCount: c._count.posts,
      })),
    );
  } catch (error) {
    return handleContentError(error, 'list categories');
  }
}

export async function createCategory(
  actor: AdminSessionUser,
  siteId: string,
  input: { name: string; slug?: string; description?: string },
): Promise<ServiceResult<{ id: string; slug: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const name = (input.name ?? '').trim();
    if (name.length < 1 || name.length > 80) {
      return fail('Category name must be 1-80 characters.', 'VALIDATION');
    }
    const slug = validateSlugInput((input.slug ?? '').trim() || slugify(name), 'slug');
    const exists = await getPrisma().category.findUnique({
      where: { siteId_slug: { siteId, slug } },
      select: { id: true },
    });
    if (exists) return fail(`A category with the slug "${slug}" already exists on this website.`, 'CONFLICT');

    const created = await getPrisma().$transaction(async (tx) => {
      const row = await tx.category.create({
        data: { id: crypto.randomUUID(), siteId, slug, name, description: input.description?.trim().slice(0, 300) || null },
        select: { id: true, slug: true },
      });
      await writeAudit(tx, {
        actor,
        action: 'category.create',
        targetSiteId: siteId,
        summary: `Created category "${name}" (${slug}).`,
      });
      return row;
    });
    return ok({ id: created.id, slug: created.slug });
  } catch (error) {
    return handleContentError(error, 'create category');
  }
}

export async function updateCategory(
  actor: AdminSessionUser,
  siteId: string,
  categoryId: string,
  input: { name: string; description?: string },
): Promise<ServiceResult<{ id: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const name = (input.name ?? '').trim();
    if (name.length < 1 || name.length > 80) {
      return fail('Category name must be 1-80 characters.', 'VALIDATION');
    }
    // Slugs are immutable: category slugs are referenced by nav links and
    // public /posts?category= URLs.
    const result = await getPrisma().$transaction(async (tx) => {
      const existing = await tx.category.findFirst({ where: { id: categoryId, siteId }, select: { id: true, name: true } });
      if (!existing) return null;
      await tx.category.update({
        where: { id: categoryId },
        data: { name, description: input.description?.trim().slice(0, 300) || null },
      });
      await writeAudit(tx, {
        actor,
        action: 'category.update',
        targetSiteId: siteId,
        summary: `Updated category "${existing.name}" → "${name}".`,
      });
      return existing;
    });
    if (!result) return fail('Category not found on this website.', 'NOT_FOUND');
    return ok({ id: result.id });
  } catch (error) {
    return handleContentError(error, 'update category');
  }
}

export async function deleteCategory(
  actor: AdminSessionUser,
  siteId: string,
  categoryId: string,
): Promise<ServiceResult<{ deleted: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const result = await getPrisma().$transaction(async (tx) => {
      const existing = await tx.category.findFirst({
        where: { id: categoryId, siteId },
        include: { _count: { select: { posts: true } } },
      });
      if (!existing) return null;
      if (existing._count.posts > 0) {
        throw new ValidationError(
          `This category still has ${existing._count.posts} post(s). Reassign or delete them first.`,
        );
      }
      await tx.category.delete({ where: { id: categoryId } });
      await writeAudit(tx, {
        actor,
        action: 'category.delete',
        targetSiteId: siteId,
        summary: `Deleted category "${existing.name}" (${existing.slug}).`,
      });
      return existing;
    });
    if (!result) return fail('Category not found on this website.', 'NOT_FOUND');
    return ok({ deleted: result.name });
  } catch (error) {
    return handleContentError(error, 'delete category');
  }
}

/* --------------------------------- authors -------------------------------- */

export interface AdminAuthor {
  id: string;
  slug: string;
  name: string;
  role?: string;
  bio?: string;
  initials: string;
  postCount: number;
}

export async function listAuthorsForAdmin(
  actor: AdminSessionUser,
  siteId: string,
): Promise<ServiceResult<AdminAuthor[]>> {
  try {
    await assertSiteAccess(actor, siteId);
    const authors = await getPrisma().author.findMany({
      where: { siteId },
      include: { _count: { select: { posts: true } } },
      orderBy: { name: 'asc' },
    });
    return ok(
      authors.map((a) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        role: a.role ?? undefined,
        bio: a.bio ?? undefined,
        initials: a.initials,
        postCount: a._count.posts,
      })),
    );
  } catch (error) {
    return handleContentError(error, 'list authors');
  }
}

export async function createAuthor(
  actor: AdminSessionUser,
  siteId: string,
  input: { name: string; role?: string; bio?: string },
): Promise<ServiceResult<{ id: string; slug: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const name = (input.name ?? '').trim();
    if (name.length < 1 || name.length > 80) {
      return fail('Author name must be 1-80 characters.', 'VALIDATION');
    }
    const slug = validateSlugInput(slugify(name), 'slug');
    const exists = await getPrisma().author.findUnique({ where: { siteId_slug: { siteId, slug } } });
    if (exists) return fail(`An author with the slug "${slug}" already exists on this website.`, 'CONFLICT');

    const initials = (name.match(/\b\w/g) ?? [name.slice(0, 2)])
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');

    const created = await getPrisma().$transaction(async (tx) => {
      const row = await tx.author.create({
        data: {
          id: crypto.randomUUID(),
          siteId,
          slug,
          name,
          initials,
          role: input.role?.trim().slice(0, 120) || null,
          bio: input.bio?.trim().slice(0, 500) || null,
        },
        select: { id: true, slug: true },
      });
      await writeAudit(tx, {
        actor,
        action: 'author.create',
        targetSiteId: siteId,
        summary: `Created author "${name}" (${slug}).`,
      });
      return row;
    });
    return ok({ id: created.id, slug: created.slug });
  } catch (error) {
    return handleContentError(error, 'create author');
  }
}

export async function updateAuthor(
  actor: AdminSessionUser,
  siteId: string,
  authorId: string,
  input: { name: string; role?: string; bio?: string },
): Promise<ServiceResult<{ id: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const name = (input.name ?? '').trim();
    if (name.length < 1 || name.length > 80) {
      return fail('Author name must be 1-80 characters.', 'VALIDATION');
    }
    const initials = (name.match(/\b\w/g) ?? [name.slice(0, 2)])
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');
    const result = await getPrisma().$transaction(async (tx) => {
      const existing = await tx.author.findFirst({ where: { id: authorId, siteId }, select: { id: true, name: true } });
      if (!existing) return null;
      await tx.author.update({
        where: { id: authorId },
        data: {
          name,
          initials,
          role: input.role?.trim().slice(0, 120) || null,
          bio: input.bio?.trim().slice(0, 500) || null,
        },
      });
      await writeAudit(tx, {
        actor,
        action: 'author.update',
        targetSiteId: siteId,
        summary: `Updated author "${existing.name}" → "${name}".`,
      });
      return existing;
    });
    if (!result) return fail('Author not found on this website.', 'NOT_FOUND');
    return ok({ id: result.id });
  } catch (error) {
    return handleContentError(error, 'update author');
  }
}

export async function deleteAuthor(
  actor: AdminSessionUser,
  siteId: string,
  authorId: string,
): Promise<ServiceResult<{ deleted: string }>> {
  try {
    await assertSiteAccess(actor, siteId);
    const result = await getPrisma().$transaction(async (tx) => {
      const existing = await tx.author.findFirst({
        where: { id: authorId, siteId },
        include: { _count: { select: { posts: true } } },
      });
      if (!existing) return null;
      if (existing._count.posts > 0) {
        throw new ValidationError(
          `This author still has ${existing._count.posts} post(s). Reassign them first.`,
        );
      }
      await tx.author.delete({ where: { id: authorId } });
      await writeAudit(tx, {
        actor,
        action: 'author.delete',
        targetSiteId: siteId,
        summary: `Deleted author "${existing.name}" (${existing.slug}).`,
      });
      return existing;
    });
    if (!result) return fail('Author not found on this website.', 'NOT_FOUND');
    return ok({ deleted: result.name });
  } catch (error) {
    return handleContentError(error, 'delete author');
  }
}

/* ---------------------------------- media --------------------------------- */

export interface AdminMediaItem {
  id: number;
  src: string;
  alt: string;
  createdAt: string;
}

export async function listMediaForAdmin(
  actor: AdminSessionUser,
  siteId: string,
): Promise<ServiceResult<AdminMediaItem[]>> {
  try {
    await assertSiteAccess(actor, siteId);
    const rows = await getPrisma().media.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return ok(
      rows.map((r) => ({
        id: r.id,
        src: r.src,
        alt: r.alt,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    return handleContentError(error, 'list media');
  }
}
