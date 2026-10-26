import { describe, expect, it } from 'vitest';
import { scaffoldStarterPackage, slugifyThemeName } from '@/lib/theme-package/starter';
import { validatePackage } from '@/lib/theme-package/validate';
import { makeZip, readZip } from '@/lib/theme-package/zip';
import { PACKAGE_LIMITS, REQUIRED_TEMPLATES } from '@/lib/theme-package/spec';
import { packageThemeDefinition } from '@/lib/theme-package/renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { demoCategories, demoHomepage, demoPosts, demoSiteContext } from '@/lib/theme-package/preview/fixtures';

/**
 * Theme Starter Kit tests: the generated package must pass the existing
 * validator unmodified, survive a ZIP round-trip, and render all four
 * template routes with the Preview Lab fixtures.
 */

function scaffoldOk(name: string, overrides: Partial<Parameters<typeof scaffoldStarterPackage>[0]> = {}) {
  const result = scaffoldStarterPackage({ name, ...overrides });
  if (!result.ok) throw new Error(`scaffold failed: ${result.error}`);
  return result;
}

describe('starter kit scaffold', () => {
  it('produces a package that passes the existing validator without fixes', () => {
    const { files, slug } = scaffoldOk('Coastal Retreat');
    expect(slug).toBe('coastal-retreat');
    const result = validatePackage(files);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.pkg.manifest.id).toBe('coastal-retreat');
    expect(result.pkg.manifest.version).toBe('0.1.0');
    expect(result.pkg.manifest.format).toBe('msp-theme');
    expect(result.pkg.manifest.compatibility.platform).toBe('1');
    expect(result.pkg.manifest.supportedBlocks).toHaveLength(11);
  });

  it('survives a ZIP export → import round-trip', () => {
    const { files } = scaffoldOk('Harbor Line');
    const zip = makeZip([...files.entries()].map(([name, data]) => ({ name, data })));
    const reread = readZip(zip);
    if (!reread.ok) throw new Error(reread.error);
    const result = validatePackage(new Map(reread.entries.map((e) => [e.name, e.data])));
    expect(result.ok).toBe(true);
  });

  it('contains all four required templates with exactly one content slot each', () => {
    const { files } = scaffoldOk('Maple & Co');
    const result = validatePackage(files);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    for (const route of REQUIRED_TEMPLATES) {
      const template = result.pkg.templates[route];
      expect(template.sections.filter((s) => s.type === 'content')).toHaveLength(1);
    }
  });

  it('ships a styles/theme.css that passes the sanitizer and a preview.png within limits', () => {
    const { files } = scaffoldOk('Alpine Base');
    const result = validatePackage(files);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.pkg.css).toContain('.msp-theme-alpine-base');
    const preview = files.get('assets/preview.png');
    expect(preview).toBeDefined();
    expect(preview!.byteLength).toBeLessThanOrEqual(PACKAGE_LIMITS.maxPreviewBytes);
    // PNG magic number — it is a real image, not a text stub.
    expect([...preview!.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it('only writes files the package format allows', () => {
    const { files } = scaffoldOk('Quiet Studio');
    for (const name of files.keys()) {
      expect(
        name === 'theme.json' || name === 'README.md'
          || name.startsWith('templates/')
          || name.startsWith('styles/')
          || name.startsWith('assets/'),
      ).toBe(true);
    }
  });

  it('documents structure and workflow in a README', () => {
    const { files, slug } = scaffoldOk('North Shore');
    const readme = new TextDecoder().decode(files.get('README.md')!);
    expect(readme).toContain(slug);
    expect(readme).toContain('theme:validate');
    expect(readme).toContain('theme:pack');
    expect(readme).toContain('Preview lab');
  });
});

describe('starter kit input rules', () => {
  it('slugifies display names', () => {
    expect(slugifyThemeName('My Great Theme!')).toBe('my-great-theme');
    expect(slugifyThemeName('  Café  Röom  ')).toBe('cafe-room');
    expect(slugifyThemeName('///')).toBeNull();
  });

  it('accepts an explicit slug and rejects invalid ones', () => {
    expect(scaffoldOk('Custom', { slug: 'custom-one' }).slug).toBe('custom-one');
    const bad = scaffoldStarterPackage({ name: 'Custom', slug: 'Bad_Slug' });
    expect(bad.ok).toBe(false);
  });

  it('rejects native theme id collisions', () => {
    const result = scaffoldStarterPackage({ name: 'Business', slug: 'business' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('native theme');
  });

  it('rejects descriptions outside 10–400 chars and non-https author URLs', () => {
    expect(scaffoldStarterPackage({ name: 'Short', description: 'tiny' }).ok).toBe(false);
    expect(scaffoldStarterPackage({ name: 'Http', authorUrl: 'http://example.com' }).ok).toBe(false);
    expect(scaffoldStarterPackage({ name: 'A' }).ok).toBe(false); // name too short
  });
});

describe('starter kit renders all four routes with lab fixtures', () => {
  const theme = packageThemeDefinition(validateOk('Willow Lane'));
  const ctx = demoSiteContext('package:willow-lane');
  const posts = demoPosts();
  const categories = demoCategories();

  function validateOk(name: string) {
    const { files } = scaffoldOk(name);
    const result = validatePackage(files);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.pkg;
  }

  it('home', () => {
    const markup = renderToStaticMarkup(
      createElement(theme.home, { ctx, page: demoHomepage(), posts, categories }),
    );
    expect(markup).toContain('Willow Lane');
    expect(markup).toContain('msp-theme-willow-lane');
  });

  it('page', () => {
    const markup = renderToStaticMarkup(
      createElement(theme.page, { ctx, page: demoHomepage(), posts, categories }),
    );
    expect(markup).toContain('Willow Lane');
  });

  it('postList', () => {
    expect(theme.postList).toBeDefined();
    const markup = renderToStaticMarkup(
      createElement(theme.postList!, { ctx, posts, categories }),
    );
    expect(markup).toContain('Designing with constraints');
  });

  it('post', () => {
    expect(theme.post).toBeDefined();
    const markup = renderToStaticMarkup(
      createElement(theme.post!, { ctx, post: posts[0]!, related: posts.slice(1, 3), categories }),
    );
    expect(markup).toContain('Designing with constraints');
  });
});
