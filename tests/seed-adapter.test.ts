import { describe, expect, it } from 'vitest';
import { seedAuthorsOf, seedCategories, seedDomainsOf, seedPages, seedPosts, seedSites } from './helpers';
import { SeedDataAdapter } from '@/platform/data/seed-adapter';

/**
 * Site-isolation and content-integrity tests for the seed adapter (no
 * database required — the same lookup contract is enforced by the PostgreSQL
 * adapter, which the integration tests verify against a live database).
 */

const db = new SeedDataAdapter();

describe('seed data integrity', () => {
  it('has exactly the three demo sites with stable ids', () => {
    expect(seedSites.map((s) => s.id).sort()).toEqual(['blog-demo', 'business-demo', 'travel-demo']);
  });

  it('maps one primary domain per site and keeps hosts globally unique', () => {
    const allHosts = seedDomainsOf();
    expect(new Set(allHosts).size).toBe(allHosts.length);
    for (const site of seedSites) {
      expect(site.domains.length).toBeGreaterThan(0);
      expect(site.domain).toBe(site.domains[0]);
    }
  });

  it('every site has exactly one homepage and unique page slugs', () => {
    for (const site of seedSites) {
      const pages = seedPages.filter((p) => p.siteId === site.id);
      const homepages = pages.filter((p) => p.isHomepage);
      expect(homepages.length, `${site.id} homepages`).toBe(1);
      const slugs = pages.map((p) => p.slug);
      expect(new Set(slugs).size, `${site.id} page slugs`).toBe(slugs.length);
    }
  });

  it('page and post slugs are unique per site (duplicates across sites are allowed)', () => {
    for (const site of seedSites) {
      const slugs = seedPosts.filter((p) => p.siteId === site.id).map((p) => p.slug);
      expect(new Set(slugs).size, `${site.id} post slugs`).toBe(slugs.length);
    }
    // Identical slugs across different sites are expected (e.g. 'contact').
    const contactPages = seedPages.filter((p) => p.slug === 'contact');
    expect(contactPages.length).toBe(3); // one per site — allowed by design
  });

  it('every post references an author, category, and site that exist', () => {
    const authors = seedAuthorsOf();
    for (const post of seedPosts) {
      const author = authors.find((a) => a.id === post.author.id);
      expect(author, `author for ${post.slug}`).toBeDefined();
      expect(author!.siteId).toBe(post.siteId);
      if (post.categoryId) {
        const category = seedCategories.find((c) => c.id === post.categoryId);
        expect(category, `category for ${post.slug}`).toBeDefined();
        expect(category!.siteId).toBe(post.siteId);
      }
    }
  });

  it('all referenced local images exist on disk', async () => {
    const { readFile } = await import('node:fs/promises');
    const path = await import('node:path');
    const publicDir = path.resolve(__dirname, '..', 'public');
    const referenced = new Set<string>();
    for (const site of seedSites) {
      if (site.settings.seo.socialImage) referenced.add(site.settings.seo.socialImage);
    }
    for (const page of seedPages) {
      for (const block of page.blocks) {
        const b = block as { type: string; image?: string; items?: { image?: string }[] };
        if ('image' in b && b.image) referenced.add(b.image);
        if (Array.isArray(b.items)) {
          for (const item of b.items) if (item.image) referenced.add(item.image);
        }
      }
    }
    for (const post of seedPosts) if (post.coverImage) referenced.add(post.coverImage);

    expect(referenced.size).toBeGreaterThan(0);
    for (const src of referenced) {
      const file = path.join(publicDir, src);
      await expect(readFile(file), `image ${src} should exist`).resolves.toBeInstanceOf(Buffer);
    }
  });
});

describe('seed adapter: site resolution', () => {
  it('resolves sites by id', async () => {
    expect((await db.getSite('business-demo'))?.name).toBe('Meridian Consulting');
    expect(await db.getSite('nonexistent')).toBeNull();
  });

  it('resolves sites by hostname with ports, case, and FQDN dots', async () => {
    expect((await db.getSiteByHost('business.demo.local:3000'))?.id).toBe('business-demo');
    expect((await db.getSiteByHost('BLOG.DEMO.LOCAL.'))?.id).toBe('blog-demo');
    expect(await db.getSiteByHost('unknown.example.org')).toBeNull();
    expect(await db.getSiteByHost('not a host')).toBeNull();
  });

  it('lists all sites', async () => {
    expect((await db.listSites()).length).toBe(3);
  });
});

describe('seed adapter: site isolation', () => {
  it('a business host cannot read a travel post (and vice versa)', async () => {
    const travelPost = seedPosts.find((p) => p.siteId === 'travel-demo')!;
    expect(await db.getPost('business-demo', travelPost.slug)).toBeNull();
    const businessPost = seedPosts.find((p) => p.siteId === 'business-demo')!;
    expect(await db.getPost('travel-demo', businessPost.slug)).toBeNull();
  });

  it('a travel site cannot read a business page', async () => {
    expect(await db.getPage('travel-demo', 'services')).toBeNull();
    expect(await db.getPage('business-demo', 'services')).not.toBeNull();
  });

  it('identical slugs coexist across sites without leaking', async () => {
    const businessContact = await db.getPage('business-demo', 'contact');
    const travelContact = await db.getPage('travel-demo', 'contact');
    expect(businessContact?.siteId).toBe('business-demo');
    expect(travelContact?.siteId).toBe('travel-demo');
    expect(businessContact).not.toEqual(travelContact);
  });

  it('posts and categories are always scoped to their own site', async () => {
    const blogPosts = await db.listPosts('blog-demo');
    expect(blogPosts.length).toBeGreaterThan(0);
    expect(blogPosts.every((p) => p.siteId === 'blog-demo')).toBe(true);

    const travelCategories = await db.listCategories('travel-demo');
    expect(travelCategories.every((c) => c.siteId === 'travel-demo')).toBe(true);
    expect(travelCategories.every((c) => c.postCount > 0)).toBe(true);
  });

  it('category filtering returns only that site and category', async () => {
    const tech = await db.listPosts('blog-demo', { categorySlug: 'technology' });
    expect(tech.length).toBe(2);
    expect(tech.every((p) => p.siteId === 'blog-demo')).toBe(true);

    // Same category slug does not exist on other sites; nothing leaks.
    expect(await db.listPosts('travel-demo', { categorySlug: 'technology' })).toEqual([]);
  });

  it('the homepage belongs to the requested site', async () => {
    for (const site of seedSites) {
      const home = await db.getHomepage(site.id);
      expect(home?.siteId).toBe(site.id);
      expect(home?.isHomepage).toBe(true);
    }
  });
});

describe('seed adapter: theme switching', () => {
  it('switching one site\u2019s theme does not change the others', async () => {
    const before = await Promise.all((await db.listSites()).map((s) => ({ id: s.id, theme: s.themeId })));
    const target = before.find((s) => s.id === 'travel-demo')!;

    const updated = await db.updateActiveTheme('travel-demo', 'blog');
    expect(updated?.themeId).toBe('blog');

    // Other sites untouched.
    expect((await db.getSite('business-demo'))?.themeId).toBe(before.find((s) => s.id === 'business-demo')!.theme);
    expect((await db.getSite('blog-demo'))?.themeId).toBe(before.find((s) => s.id === 'blog-demo')!.theme);

    // Restore.
    await db.updateActiveTheme('travel-demo', target.theme);
    expect((await db.getSite('travel-demo'))?.themeId).toBe(target.theme);
  });
});
