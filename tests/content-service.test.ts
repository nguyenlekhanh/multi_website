import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/admin/password';
import type { AdminSessionUser } from '@/lib/admin/types';
import {
  createAuthor,
  updateAuthor,
  createCategory,
  createPage,
  createPost,
  deleteAuthor,
  deleteCategory,
  deletePage,
  deletePost,
  getPageForAdmin,
  listAuthorsForAdmin,
  listCategoriesForAdmin,
  listMediaForAdmin,
  listPagesForAdmin,
  setPageStatus,
  setPostStatus,
  updatePage,
  updatePost,
} from '@/lib/admin/content-service';
import { PostgresDataAdapter } from '@/platform/data/postgres-adapter';
import { seedDatabase } from '../prisma/seed';

/**
 * Phase 3B integration tests: the content service against a real PostgreSQL
 * database. Skipped unless TEST_DATABASE_URL points at a disposable database.
 *
 * Covers page/post CRUD, draft/publish semantics against the PUBLIC adapter,
 * slug rules, invalid blocks, cross-site relation rejection, SITE_ADMIN
 * scoping, media scoping, and audit-on-success.
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

const prisma = TEST_DATABASE_URL
  ? new PrismaClient({ datasources: { db: { url: `${TEST_DATABASE_URL}${TEST_DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=3` } } })
  : (null as unknown as PrismaClient);

const superAdmin: AdminSessionUser = {
  id: 'cms-super', email: 'cms-super@test.local', name: 'CMS Super', role: 'SUPER_ADMIN',
};
const travelEditor: AdminSessionUser = {
  id: 'cms-editor', email: 'cms-editor@test.local', name: 'CMS Editor', role: 'SITE_ADMIN',
};

const PAGE_SLUG = 'cms-test-page';
const POST_SLUG = 'cms-test-post';
const d = TEST_DATABASE_URL ? new PostgresDataAdapter(prisma) : (null as unknown as PostgresDataAdapter);

async function cleanupFixtures() {
  await prisma.auditLog.deleteMany({
    where: { actorEmail: { in: [superAdmin.email, travelEditor.email] } },
  });
  for (const slug of [PAGE_SLUG, 'cms-edit-title-page', 'cms-no-blocks', 'cms-new-home', 'cms-audit-page']) {
    const page = await prisma.page.findFirst({ where: { siteId: 'travel-demo', slug } });
    if (page) await prisma.page.delete({ where: { id: page.id } });
  }
  // Restore the seed homepage flag (the homepage-promotion test consumes it).
  const homePage = await prisma.page.findFirst({ where: { siteId: 'travel-demo', slug: 'home' } });
  if (homePage && !(await prisma.page.findFirst({ where: { siteId: 'travel-demo', isHomepage: true } }))) {
    await prisma.page.update({ where: { id: homePage.id }, data: { isHomepage: true } });
  }
  for (const slug of [POST_SLUG, 'cms-empty-body', 'cms-cross-author', 'cms-cross-category']) {
    const post = await prisma.post.findFirst({ where: { siteId: 'travel-demo', slug } });
    if (post) await prisma.post.delete({ where: { id: post.id } });
  }
  await prisma.category.deleteMany({ where: { siteId: 'travel-demo', slug: 'cms-test-category' } });
  await prisma.author.deleteMany({ where: { siteId: 'travel-demo', slug: 'cms-test-author' } });
}

describe.skipIf(!TEST_DATABASE_URL)('content service (integration)', () => {
  beforeAll(async () => {
    if (!/test|localhost|127\.0\.0\.1/.test(TEST_DATABASE_URL!)) {
      throw new Error('TEST_DATABASE_URL must point at a disposable local/test database.');
    }
    if (!(await prisma.site.findUnique({ where: { id: 'travel-demo' } }))) {
      await seedDatabase(prisma);
    }
    // Isolated actors.
    await prisma.adminUser.deleteMany({ where: { email: { in: [superAdmin.email, travelEditor.email] } } });
    await prisma.adminUser.createMany({
      data: [
        { id: superAdmin.id, email: superAdmin.email, name: superAdmin.name, role: 'SUPER_ADMIN', passwordHash: await hashPassword('cms-super-pass-123456') },
        { id: travelEditor.id, email: travelEditor.email, name: travelEditor.name, role: 'SITE_ADMIN', passwordHash: await hashPassword('cms-editor-pass-1234') },
      ],
    });
    await prisma.siteMembership.create({ data: { userId: travelEditor.id, siteId: 'travel-demo' } });
    await cleanupFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures();
    await prisma.adminUser.deleteMany({ where: { email: { in: [superAdmin.email, travelEditor.email] } } });
    await prisma.$disconnect();
  });

  /* --------------------------------- pages -------------------------------- */

  it('creates a page as draft (invisible publicly), then publishes it', async () => {
    const created = await createPage(superAdmin, 'travel-demo', {
      title: 'CMS Test Page',
      slug: PAGE_SLUG,
      blocks: [
        { type: 'hero', eyebrow: 'Test', title: 'Hello from the CMS', subtitle: 'Created by an integration test' },
        { type: 'richtext', heading: 'About', paragraphs: ['First paragraph.', 'Second paragraph.'] },
      ],
      seoTitle: 'Custom SEO Title',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.status).toBe('DRAFT');

    // Drafts never resolve publicly.
    expect(await d.getPage('travel-demo', PAGE_SLUG)).toBeNull();

    // Admin preview CAN read drafts.
    const adminView = await getPageForAdmin(superAdmin, 'travel-demo', created.data.id);
    expect(adminView.ok && adminView.data.status).toBe('DRAFT');
    expect(adminView.ok && adminView.data.blocks.length).toBe(2);

    // Publish → public visibility + timestamp.
    const published = await setPageStatus(superAdmin, 'travel-demo', created.data.id, 'PUBLISHED');
    expect(published.ok).toBe(true);
    const publicPage = await d.getPage('travel-demo', PAGE_SLUG);
    expect(publicPage?.title).toBe('CMS Test Page');
    expect(publicPage?.blocks.length).toBe(2);

    // Unpublish → hidden again, record retained.
    await setPageStatus(superAdmin, 'travel-demo', created.data.id, 'DRAFT');
    expect(await d.getPage('travel-demo', PAGE_SLUG)).toBeNull();
    expect((await getPageForAdmin(superAdmin, 'travel-demo', created.data.id)).ok).toBe(true);
  });

  it('rejects empty blocks when publishing and invalid blocks always', async () => {
    const created = await createPage(superAdmin, 'travel-demo', {
      title: 'No blocks yet',
      slug: 'cms-no-blocks',
      blocks: [],
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const publishEmpty = await setPageStatus(superAdmin, 'travel-demo', created.data.id, 'PUBLISHED');
    expect(publishEmpty.ok).toBe(false);
    if (!publishEmpty.ok) expect(publishEmpty.code).toBe('VALIDATION');

    const badBlock = await updatePage(superAdmin, 'travel-demo', created.data.id, {
      title: 'No blocks yet',
      slug: 'cms-no-blocks',
      blocks: [{ type: 'not-a-real-type', title: 'evil' }],
    });
    expect(badBlock.ok).toBe(false);
    if (!badBlock.ok) expect(badBlock.code).toBe('VALIDATION');

    const malformed = await updatePage(superAdmin, 'travel-demo', created.data.id, {
      title: 'No blocks yet',
      slug: 'cms-no-blocks',
      blocks: [{ type: 'hero', title: 42 }],
    });
    expect(malformed.ok).toBe(false);

    await deletePage(superAdmin, 'travel-demo', created.data.id);
  });

  it('enforces slug uniqueness per site and allows the same slug on another site', async () => {
    const created = await createPage(superAdmin, 'travel-demo', {
      title: 'Slug collision page',
      slug: PAGE_SLUG,
      blocks: [{ type: 'richtext', paragraphs: ['x'] }],
    });
    expect(created.ok).toBe(false);
    if (!created.ok) expect(created.code).toBe('CONFLICT');

    // Same slug on a different site is fine.
    const onOtherSite = await createPage(superAdmin, 'blog-demo', {
      title: 'Slug on another site',
      slug: PAGE_SLUG,
      blocks: [{ type: 'richtext', paragraphs: ['x'] }],
    });
    expect(onOtherSite.ok).toBe(true);
    await deletePage(superAdmin, 'blog-demo', onOtherSite.ok ? onOtherSite.data.id : 0);
  });

  it('editing a title does not change the slug; slugs stay unique on change', async () => {
    const created = await createPage(superAdmin, 'travel-demo', {
      title: 'CMS Edit Title Page',
      slug: 'cms-edit-title-page',
      blocks: [{ type: 'richtext', paragraphs: ['x'] }],
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const renamed = await updatePage(superAdmin, 'travel-demo', created.data.id, {
      title: 'Completely New Title',
      slug: 'cms-edit-title-page', // slug submitted unchanged
      blocks: [{ type: 'richtext', paragraphs: ['x'] }],
    });
    expect(renamed.ok).toBe(true);
    const detail = await getPageForAdmin(superAdmin, 'travel-demo', created.data.id);
    expect(detail.ok && detail.data.slug).toBe('cms-edit-title-page');
    expect(detail.ok && detail.data.title).toBe('Completely New Title');

    // Changing to a taken slug is rejected with a useful message.
    const collision = await updatePage(superAdmin, 'travel-demo', created.data.id, {
      title: 'Collision',
      slug: 'contact',
      blocks: [{ type: 'richtext', paragraphs: ['x'] }],
    });
    expect(collision.ok).toBe(false);
    if (!collision.ok) expect(collision.code).toBe('CONFLICT');
  });

  it('protects the homepage from deletion and promotes a new homepage', async () => {
    const home = await getPageForAdmin(superAdmin, 'travel-demo', 0).catch(() => null);
    void home;
    const pages = await listPagesForAdmin(superAdmin, 'travel-demo', { pageSize: 50 });
    const homepage = pages.ok ? pages.data.items.find((p) => p.isHomepage) : undefined;
    expect(homepage).toBeDefined();

    if (homepage) {
      const deleted = await deletePage(superAdmin, 'travel-demo', homepage.id);
      expect(deleted.ok).toBe(false);
      if (!deleted.ok) expect(deleted.code).toBe('VALIDATION');
    }

    // Creating a page marked as homepage moves the flag.
    const created = await createPage(superAdmin, 'travel-demo', {
      title: 'New Homepage',
      slug: 'cms-new-home',
      isHomepage: true,
      blocks: [{ type: 'richtext', paragraphs: ['x'] }],
    });
    expect(created.ok).toBe(true);
    if (created.ok) {
      const after = await listPagesForAdmin(superAdmin, 'travel-demo', { pageSize: 50 });
      const homes = after.ok ? after.data.items.filter((p) => p.isHomepage) : [];
      expect(homes.length).toBe(1);
      expect(homes[0].slug).toBe('cms-new-home');
      await deletePage(superAdmin, 'travel-demo', created.data.id);
    }
  });

  it('lists pages with search, status filter, and pagination', async () => {
    const all = await listPagesForAdmin(superAdmin, 'travel-demo', { pageSize: 2, page: 1 });
    expect(all.ok && all.data.items.length).toBeLessThanOrEqual(2);
    expect(all.ok && all.data.total).toBeGreaterThanOrEqual(2);

    const search = await listPagesForAdmin(superAdmin, 'travel-demo', { search: PAGE_SLUG });
    expect(search.ok && search.data.total).toBe(1);

    const drafts = await listPagesForAdmin(superAdmin, 'travel-demo', { status: 'DRAFT' });
    expect(drafts.ok && drafts.data.items.every((p) => p.status === 'DRAFT')).toBe(true);
  });

  /* --------------------------------- posts -------------------------------- */

  it('creates a post with site-scoped relations and publishes it', async () => {
    const created = await createPost(superAdmin, 'travel-demo', {
      title: 'CMS Test Post',
      slug: POST_SLUG,
      excerpt: 'Created by an integration test.',
      body: ['First paragraph.', 'Second paragraph.'],
      authorId: 'amara-chen', // belongs to travel-demo
      categoryId: 'cat-destinations',
      tags: ['test', 'cms'],
      status: 'DRAFT',
    });
    expect(created.ok).toBe(true);

    // Draft is invisible publicly even though the post exists.
    expect(await d.getPost('travel-demo', POST_SLUG)).toBeNull();

    const published = await setPostStatus(superAdmin, 'travel-demo', created.ok ? created.data.id : 0, 'PUBLISHED');
    expect(published.ok).toBe(true);

    const publicPost = await d.getPost('travel-demo', POST_SLUG);
    expect(publicPost?.title).toBe('CMS Test Post');
    expect(publicPost?.body.length).toBe(2);

    // Editing a published post does not change its published timestamp.
    const before = publicPost?.publishedAt;
    await new Promise((r) => setTimeout(r, 20));
    const updated = await updatePost(superAdmin, 'travel-demo', created.ok ? created.data.id : 0, {
      title: 'CMS Test Post (edited)',
      slug: POST_SLUG,
      excerpt: 'Edited.',
      body: ['Edited paragraph.'],
      authorId: 'amara-chen',
      status: 'PUBLISHED',
    });
    expect(updated.ok).toBe(true);
    const after = await d.getPost('travel-demo', POST_SLUG);
    expect(after?.publishedAt).toBe(before);
    expect(after?.title).toBe('CMS Test Post (edited)');
  });

  it('rejects cross-site authors and categories', async () => {
    // amara-chen belongs to travel-demo; blog-demo authors are different ids.
    const crossSiteAuthor = await createPost(superAdmin, 'blog-demo', {
      title: 'Cross-site author',
      slug: 'cms-cross-author',
      body: ['x'],
      authorId: 'amara-chen', // travel-demo author on blog-demo
      status: 'DRAFT',
    });
    expect(crossSiteAuthor.ok).toBe(false);
    if (!crossSiteAuthor.ok) expect(crossSiteAuthor.code).toBe('VALIDATION');

    const crossSiteCategory = await createPost(superAdmin, 'travel-demo', {
      title: 'Cross-site category',
      slug: 'cms-cross-category',
      body: ['x'],
      authorId: 'amara-chen',
      categoryId: 'cat-culture', // blog-demo category on travel-demo
      status: 'DRAFT',
    });
    expect(crossSiteCategory.ok).toBe(false);
    if (!crossSiteCategory.ok) expect(crossSiteCategory.code).toBe('VALIDATION');
  });

  it('rejects publishing posts without body paragraphs', async () => {
    const created = await createPost(superAdmin, 'travel-demo', {
      title: 'Empty body post',
      slug: 'cms-empty-body',
      body: [],
      authorId: 'amara-chen',
      status: 'DRAFT',
    });
    expect(created.ok).toBe(true);
    const publish = await setPostStatus(superAdmin, 'travel-demo', created.ok ? created.data.id : 0, 'PUBLISHED');
    expect(publish.ok).toBe(false);
    if (!publish.ok) expect(publish.code).toBe('VALIDATION');
    await deletePost(superAdmin, 'travel-demo', created.ok ? created.data.id : 0);
  });

  it('deletes posts and writes an audit entry', async () => {
    const created = await createPost(superAdmin, 'travel-demo', {
      title: 'Post to delete',
      slug: 'cms-delete-me',
      body: ['x'],
      authorId: 'amara-chen',
      status: 'PUBLISHED',
    });
    expect(created.ok).toBe(true);
    const deleted = await deletePost(superAdmin, 'travel-demo', created.ok ? created.data.id : 0);
    expect(deleted.ok).toBe(true);
    expect(await d.getPost('travel-demo', 'cms-delete-me')).toBeNull();

    const audit = await auditFor('travel-demo');
    expect(audit.some((e) => e.action === 'post.delete')).toBe(true);
  });

  /* ------------------------------- scoping -------------------------------- */

  it('SITE_ADMIN can manage assigned-site content only', async () => {
    const allowed = await listPagesForAdmin(travelEditor, 'travel-demo');
    expect(allowed.ok).toBe(true);

    const deniedPage = await listPagesForAdmin(travelEditor, 'business-demo');
    expect(deniedPage.ok).toBe(false);
    if (!deniedPage.ok) expect(deniedPage.code).toBe('FORBIDDEN');

    const deniedRead = await getPageForAdmin(travelEditor, 'business-demo', 1);
    expect(deniedRead.ok).toBe(false);

    const deniedCreate = await createPage(travelEditor, 'business-demo', {
      title: 'Evil',
      slug: 'evil',
      blocks: [{ type: 'richtext', paragraphs: ['x'] }],
    });
    expect(deniedCreate.ok).toBe(false);
    if (!deniedCreate.ok) expect(deniedCreate.code).toBe('FORBIDDEN');

    const deniedPost = await createPost(travelEditor, 'business-demo', {
      title: 'Evil post',
      slug: 'evil-post',
      body: ['x'],
      authorId: 'elena-voss',
      status: 'DRAFT',
    });
    expect(deniedPost.ok).toBe(false);
  });

  it('media listing is site-scoped', async () => {
    const travelMedia = await listMediaForAdmin(superAdmin, 'travel-demo');
    expect(travelMedia.ok && travelMedia.data.every((m) => m.src.startsWith('/images/travel/'))).toBe(true);
  });

  /* ------------------------- categories and authors ----------------------- */

  it('manages categories with unique slugs and safe deletion', async () => {
    const created = await createCategory(superAdmin, 'travel-demo', {
      name: 'CMS Test Category',
      slug: 'cms-test-category',
      description: 'From integration tests',
    });
    expect(created.ok).toBe(true);

    const duplicate = await createCategory(superAdmin, 'travel-demo', { name: 'Dup', slug: 'cms-test-category' });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.code).toBe('CONFLICT');

    const listed = await listCategoriesForAdmin(superAdmin, 'travel-demo');
    expect(listed.ok && listed.data.some((c) => c.slug === 'cms-test-category')).toBe(true);

    // Empty category deletes fine.
    const deleted = await deleteCategory(superAdmin, 'travel-demo', created.ok ? created.data.id : '');
    expect(deleted.ok).toBe(true);
  });

  it('prevents deleting a category that still has posts', async () => {
    const deleted = await deleteCategory(superAdmin, 'travel-demo', 'cat-destinations');
    expect(deleted.ok).toBe(false);
    if (!deleted.ok) expect(deleted.code).toBe('VALIDATION');
    // The category and its posts survive.
    expect((await d.getPost('travel-demo', 'kyoto-in-autumn-a-slow-travel-guide'))?.title).toBeTruthy();
  });

  it('manages authors and protects authors with posts', async () => {
    const created = await createAuthor(superAdmin, 'travel-demo', {
      name: 'CMS Test Author',
      role: 'Tester',
      bio: 'From the integration suite',
    });
    expect(created.ok).toBe(true);

    const listed = await listAuthorsForAdmin(superAdmin, 'travel-demo');
    expect(listed.ok && listed.data.some((a) => a.slug === 'cms-test-author')).toBe(true);

    const updated = await updateAuthor(superAdmin, 'travel-demo', created.ok ? created.data.id : '', {
      name: 'CMS Test Author (edited)',
    });
    expect(updated.ok).toBe(true);

    const deleted = await deleteAuthor(superAdmin, 'travel-demo', created.ok ? created.data.id : '');
    expect(deleted.ok).toBe(true);

    // Seed author with posts is protected (amara-chen wrote the kyoto post).
    const protectedAuthor = await deleteAuthor(superAdmin, 'travel-demo', 'amara-chen');
    expect(protectedAuthor.ok).toBe(false);
  });

  it('audit entries are written for committed content operations', async () => {
    const created = await createPage(superAdmin, 'travel-demo', {
      title: 'Audit trail page',
      slug: 'cms-audit-page',
      blocks: [{ type: 'richtext', paragraphs: ['x'] }],
    });
    expect(created.ok).toBe(true);
    const id = created.ok ? created.data.id : 0;

    let audit = await auditFor('travel-demo');
    expect(audit.some((e) => e.action === 'page.create')).toBe(true);

    // A FAILED operation writes nothing new.
    const before = audit.length;
    await updatePage(superAdmin, 'travel-demo', id, {
      title: 'Audit trail page',
      slug: 'contact', // collision → fails
      blocks: [{ type: 'richtext', paragraphs: ['x'] }],
    });
    audit = await auditFor('travel-demo');
    expect(audit.length).toBe(before);

    await deletePage(superAdmin, 'travel-demo', id);
    audit = await auditFor('travel-demo');
    expect(audit.some((e) => e.action === 'page.delete')).toBe(true);
  });

  it('public themes still render existing seed content', async () => {
    const home = await d.getPage('travel-demo', 'home');
    expect(home?.blocks.length).toBeGreaterThan(0);
    const kyoto = await d.getPost('travel-demo', 'kyoto-in-autumn-a-slow-travel-guide');
    expect(kyoto?.author.name).toBe('Amara Chen');
    expect((await d.listPosts('blog-demo')).length).toBe(6);
  });

  /* -------------------------------- helpers ------------------------------- */

  async function auditFor(targetSiteId: string) {
    const result = await listAuditEntries(superAdmin, { siteId: targetSiteId });
    return result;
  }

  async function listAuditEntries(_actor: AdminSessionUser, options: { siteId: string }) {
    const { listAudit } = await import('@/lib/admin/sites-service');
    const result = await listAudit(superAdmin, options);
    return result.ok ? result.data : [];
  }
});
