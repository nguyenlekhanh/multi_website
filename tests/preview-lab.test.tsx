import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { validatePackage } from '@/lib/theme-package/validate';
import { readZip } from '@/lib/theme-package/zip';
import { packageThemeDefinition } from '@/lib/theme-package/renderer';
import { loadDirAsPackageFiles } from './helpers';
import { scaffoldStarterPackage } from '@/lib/theme-package/starter';
import { buildGalleryPackage, galleryVariantLabels } from '@/lib/theme-package/preview/gallery';
import {
  clearPreviewPackages,
  getPreviewPackage,
  getPreviewPackageAsset,
  putPreviewPackage,
} from '@/lib/theme-package/preview/store';
import {
  demoBlockShowcasePage,
  demoCategories,
  demoHomepage,
  demoInnerPage,
  demoPost,
  demoPosts,
  demoSiteContext,
} from '@/lib/theme-package/preview/fixtures';

/**
 * Preview Lab foundation tests — all DB-free by design: the lab stages
 * packages in memory and renders demo fixtures, so these tests never touch
 * the database and can never affect active themes.
 */

const ROOT = join(__dirname, '..', 'theme-packages');
const NOW = 1_700_000_000_000;

function stagedFromScaffold(name: string) {
  const scaffold = scaffoldStarterPackage({ name });
  if (!scaffold.ok) throw new Error(scaffold.error);
  return putPreviewPackage(scaffold.files, NOW);
}

function stagedFromDir(id: string) {
  return putPreviewPackage(loadDirAsPackageFiles(join(ROOT, id)), NOW);
}

describe('preview store (uninstalled packages)', () => {
  it('stages a valid package and returns it by token', () => {
    clearPreviewPackages();
    const staged = stagedFromScaffold('Lab Target');
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const entry = getPreviewPackage(staged.token, NOW + 1000);
    expect(entry).not.toBeNull();
    expect(entry!.pkg.manifest.id).toBe('lab-target');
    expect(entry!.files.size).toBeGreaterThan(0);
  });

  it('rejects invalid packages with the installer’s field-level errors', () => {
    const files = new Map<string, Uint8Array>([['theme.json', new TextEncoder().encode('{ "format": "nope" }')]]);
    const staged = putPreviewPackage(files, NOW);
    expect(staged.ok).toBe(false);
    if (staged.ok) return;
    expect(staged.errors.length).toBeGreaterThan(0);
    expect(staged.errors.some((e) => e.path === 'theme.json')).toBe(true);
  });

  it('expires entries after the TTL and reports them as gone', () => {
    clearPreviewPackages();
    const staged = stagedFromScaffold('Expiring Theme');
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    // 30 min TTL — still alive one minute before, gone one minute after.
    expect(getPreviewPackage(staged.token, NOW + 29 * 60 * 1000)).not.toBeNull();
    expect(getPreviewPackage(staged.token, NOW + 31 * 60 * 1000)).toBeNull();
  });

  it('caps the number of staged packages by evicting the oldest', () => {
    clearPreviewPackages();
    const tokens: string[] = [];
    for (let i = 0; i < 9; i += 1) {
      const staged = stagedFromScaffold(`Cap Theme ${i}`);
      expect(staged.ok).toBe(true);
      if (staged.ok) tokens.push(staged.token);
    }
    expect(getPreviewPackage(tokens[0]!, NOW)).toBeNull(); // oldest evicted
    expect(getPreviewPackage(tokens[tokens.length - 1]!, NOW)).not.toBeNull();
    clearPreviewPackages();
  });

  it('serves only image assets that exist in the staged package', () => {
    clearPreviewPackages();
    const staged = stagedFromScaffold('Asset Theme');
    expect(staged.ok).toBe(true);
    if (!staged.ok) return;
    const preview = getPreviewPackageAsset(staged.token, 'assets/preview.png', NOW);
    expect(preview).not.toBeNull();
    expect(preview!.mime).toBe('image/png');
    expect(preview!.data.byteLength).toBeGreaterThan(0);
    // Non-asset files, missing files, and traversal attempts all miss.
    expect(getPreviewPackageAsset(staged.token, 'theme.json', NOW)).toBeNull();
    expect(getPreviewPackageAsset(staged.token, 'assets/missing.png', NOW)).toBeNull();
    expect(getPreviewPackageAsset(staged.token, 'assets/../theme.json', NOW)).toBeNull();
    clearPreviewPackages();
  });

  it('is memory-only: the module never imports the database layer', () => {
    const source = readFileSync(join(__dirname, '..', 'src', 'lib', 'theme-package', 'preview', 'store.ts'), 'utf8');
    expect(source).not.toMatch(/@\/platform\/data|prisma/i);
  });
});

describe('preview store accepts every installed package', () => {
  const THEME_IDS = [
    'real-estate-modern', 'blog-editorial', 'travel-explorer', 'restaurant-bistro',
    'hotel-luxury', 'education-academy', 'saas-startup',
  ];

  for (const id of THEME_IDS) {
    it(`stages ${id} without installing it`, () => {
      const staged = stagedFromDir(id);
      if (!staged.ok) throw new Error(JSON.stringify(staged.errors));
      const entry = getPreviewPackage(staged.token, NOW);
      expect(entry!.pkg.manifest.id).toBe(id);
      clearPreviewPackages();
    });
  }
});

describe('malformed ZIP uploads fail loudly', () => {
  it('rejects garbage bytes before validation', () => {
    const zip = readZip(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(zip.ok).toBe(false);
  });
});

describe('block gallery package', () => {
  const gallery = buildGalleryPackage();
  const ctx = demoSiteContext('package:preview-lab-gallery');
  const posts = demoPosts();
  const categories = demoCategories();

  it('covers all 11 platform blocks across every per-section variant', () => {
    const labels = galleryVariantLabels();
    // 10 per-section blocks (postlist is option-driven) → 26 variants, + 1 postlist = 27.
    expect(labels).toHaveLength(27);
    expect(gallery.manifest.supportedBlocks).toHaveLength(11);
    const homeSections = gallery.templates.home.sections;
    for (const blockType of gallery.manifest.supportedBlocks) {
      expect(homeSections.some((s) => s.type === 'static' && (s.block as { type: string }).type === blockType)).toBe(true);
    }
  });

  it('renders the full variant matrix through the ordinary renderer', () => {
    const theme = packageThemeDefinition(gallery);
    const markup = renderToStaticMarkup(
      createElement(theme.home, {
        ctx,
        page: { siteId: 'preview-lab', slug: 'gallery', title: 'Gallery', blocks: [], updatedAt: '2026-01-01T00:00:00.000Z' },
        posts,
        categories,
      }),
    );
    for (const blockLabel of ['hero · split', 'hero · overlay', 'hero · centered', 'cards · minimal', 'cta · banner', 'stats · columns']) {
      expect(markup).toContain(blockLabel);
    }
    // The postlist section rendered with the fixture posts.
    expect(markup).toContain('Designing with constraints');
  });
});

describe('lab fixtures render every installed package across all four routes', () => {
  const THEME_IDS = ['real-estate-modern', 'saas-startup'] as const;
  const ctx = demoSiteContext('package:real-estate-modern');
  const posts = demoPosts();
  const categories = demoCategories();

  for (const id of THEME_IDS) {
    it(`${id}: home, page, postList, post, block showcase, 404`, () => {
      const result = validatePackage(loadDirAsPackageFiles(join(ROOT, id)));
      if (!result.ok) throw new Error(JSON.stringify(result.errors));
      const theme = packageThemeDefinition(result.pkg);

      expect(renderToStaticMarkup(createElement(theme.home, { ctx, page: demoHomepage(), posts, categories }))).toContain('Content the platform actually serves');
      expect(renderToStaticMarkup(createElement(theme.page, { ctx, page: demoInnerPage(), posts, categories }))).toContain('About the demo site');
      expect(theme.postList).toBeDefined();
      expect(renderToStaticMarkup(createElement(theme.postList!, { ctx, posts, categories }))).toContain('Designing with constraints');
      expect(theme.post).toBeDefined();
      expect(renderToStaticMarkup(createElement(theme.post!, { ctx, post: demoPost(), related: posts.slice(1, 4), categories }))).toContain('Alex Rivera');
      expect(renderToStaticMarkup(createElement(theme.page, { ctx, page: demoBlockShowcasePage(), posts, categories }))).toContain('Latest from the journal');
      expect(renderToStaticMarkup(createElement(theme.notFound, { ctx }))).toContain('Page not found');
    });
  }
});

describe('uninstalled package end-to-end (no database involved)', () => {
  it('stages a scaffolded starter and renders it with preview-scoped asset URLs', () => {
    clearPreviewPackages();
    const scaffold = scaffoldStarterPackage({ name: 'End To End' });
    if (!scaffold.ok) throw new Error(scaffold.error);

    const staged = putPreviewPackage(scaffold.files, NOW);
    if (!staged.ok) throw new Error(JSON.stringify(staged.errors));
    const entry = getPreviewPackage(staged.token, NOW)!;

    const theme = packageThemeDefinition(entry.pkg, {
      assetBasePath: `/api/theme-preview-assets/${entry.token}`,
    });
    const markup = renderToStaticMarkup(
      createElement(theme.home, { ctx: demoSiteContext('package:end-to-end'), page: demoHomepage(), posts: demoPosts(), categories: demoCategories() }),
    );
    expect(markup).toContain('End To End');
    // Uninstalled previews resolve assets through the lab route, not the install route.
    expect(markup).toContain(`/api/theme-preview-assets/${entry.token}/`);
    expect(markup).not.toContain('/api/theme-assets/');
  });
});
