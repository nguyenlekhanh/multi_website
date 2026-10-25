import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { loadDirAsPackageFiles } from './helpers';
import { validatePackage, compareSemver, type PackageFiles } from '@/lib/theme-package/validate';
import { makeZip, readZip } from '@/lib/theme-package/zip';
import { sanitizeAndScopeThemeCss } from '@/lib/theme-package/css';

/**
 * Theme package v1 tests: validator rules, ZIP safety, CSS scoping, and the
 * pack → validate → unpack → validate round-trip against the real sample
 * theme in theme-packages/real-estate-modern.
 */

const SAMPLE_DIR = join(__dirname, '..', 'theme-packages', 'real-estate-modern');

function loadSampleDir(): PackageFiles {
  return loadDirAsPackageFiles(SAMPLE_DIR);
}

const validManifest = {
  format: 'msp-theme',
  formatVersion: 1,
  id: 'test-theme',
  name: 'Test Theme',
  version: '1.0.0',
  description: 'A description long enough to satisfy the validator contract.',
  author: { name: 'Tester' },
  compatibility: { platform: '1' },
  features: ['responsive'],
  supportedBlocks: ['hero', 'richtext'],
  entry: {
    templates: {
      home: 'templates/home.json',
      page: 'templates/page.json',
      postList: 'templates/post-list.json',
      post: 'templates/post.json',
    },
  },
  layout: {
    header: { variant: 'logo-left-nav', sticky: true },
    footer: { variant: 'minimal', showTagline: false },
    typography: { headingFont: 'sans', bodyFont: 'sans' },
    colors: { mode: 'brand' },
  },
};

const validTemplate = (route: string) => ({
  route,
  contentHeader: { style: 'band', showEyebrow: true },
  sections: [{ type: 'content' }],
  options: {},
});

function buildFiles(overrides?: {
  manifest?: unknown;
  templates?: Record<string, unknown>;
  extra?: Array<[string, string | Uint8Array]>;
  drop?: string[];
}): PackageFiles {
  const files: PackageFiles = new Map();
  const manifest = overrides?.manifest ?? validManifest;
  files.set('theme.json', new TextEncoder().encode(JSON.stringify(manifest)));
  const templates = overrides?.templates ?? {
    home: validTemplate('home'),
    page: validTemplate('page'),
    postList: validTemplate('postList'),
    post: validTemplate('post'),
  };
  for (const [route, template] of Object.entries(templates)) {
    const fileName = route === 'postList' ? 'post-list' : route;
    files.set(`templates/${fileName}.json`, new TextEncoder().encode(JSON.stringify(template)));
  }
  for (const [name, content] of overrides?.extra ?? []) {
    files.set(name, typeof content === 'string' ? new TextEncoder().encode(content) : content);
  }
  for (const name of overrides?.drop ?? []) files.delete(name);
  return files;
}

describe('theme package validator', () => {
  it('accepts the committed sample theme (real-estate-modern)', () => {
    const result = validatePackage(loadSampleDir());
    if (!result.ok) console.log(result.errors);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pkg.manifest.id).toBe('real-estate-modern');
      expect(result.pkg.templates.home.route).toBe('home');
      expect(result.pkg.css).toContain('.msp-theme-real-estate-modern');
      expect(result.pkg.preview?.mime).toBe('image/png');
    }
  });

  it('accepts a minimal valid package', () => {
    expect(validatePackage(buildFiles()).ok).toBe(true);
  });

  it('rejects a missing manifest', () => {
    const result = validatePackage(buildFiles({ drop: ['theme.json'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.path === 'theme.json')).toBe(true);
  });

  it('rejects the wrong schema version', () => {
    const result = validatePackage(buildFiles({ manifest: { ...validManifest, formatVersion: 2 } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.field === 'formatVersion')).toBe(true);
  });

  it('rejects invalid ids, names, and versions', () => {
    for (const patch of [
      { id: 'Bad_ID' },
      { name: 'x' },
      { version: 'latest' },
      { description: 'short' },
    ]) {
      const result = validatePackage(buildFiles({ manifest: { ...validManifest, ...patch } }));
      expect(result.ok, JSON.stringify(patch)).toBe(false);
    }
  });

  it('rejects a missing entry file', () => {
    const result = validatePackage(buildFiles({ drop: ['templates/post.json'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('does not exist'))).toBe(true);
  });

  it('rejects path traversal in entry paths', () => {
    const result = validatePackage(
      buildFiles({ manifest: { ...validManifest, entry: { ...validManifest.entry, templates: { ...validManifest.entry.templates, post: '../outside.json' } } } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('traversal'))).toBe(true);
  });

  it('rejects unsupported block types in supportedBlocks and sections', () => {
    const manifest = { ...validManifest, supportedBlocks: ['hero', 'mega-carousel'] };
    let result = validatePackage(buildFiles({ manifest }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('Unknown block type'))).toBe(true);

    const template = { ...validTemplate('home'), sections: [{ type: 'content' }, { type: 'static', block: { type: 'weather-widget' } }] };
    result = validatePackage(buildFiles({ templates: { home: template, page: validTemplate('page'), postList: validTemplate('postList'), post: validTemplate('post') } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('Unsupported block type'))).toBe(true);
  });

  it('rejects a section block that the manifest does not declare', () => {
    const template = { ...validTemplate('home'), sections: [{ type: 'content' }, { type: 'static', block: { type: 'cta', heading: 'H', buttonLabel: 'B', buttonHref: '/contact' } }] };
    const result = validatePackage(buildFiles({ templates: { home: template, page: validTemplate('page'), postList: validTemplate('postList'), post: validTemplate('post') } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('not declared in manifest.supportedBlocks'))).toBe(true);
  });

  it('rejects unknown block variants', () => {
    const template = { ...validTemplate('home'), sections: [{ type: 'content' }, { type: 'static', variant: 'hologram', block: { type: 'hero', title: 'Hello theme world' } }] };
    const manifest = { ...validManifest, supportedBlocks: ['hero', 'richtext'] };
    const result = validatePackage(buildFiles({ manifest, templates: { home: template, page: validTemplate('page'), postList: validTemplate('postList'), post: validTemplate('post') } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('Unknown variant'))).toBe(true);
  });

  it('rejects malformed static blocks through the CMS validator', () => {
    const template = { ...validTemplate('home'), sections: [{ type: 'content' }, { type: 'static', block: { type: 'hero', title: 42 } }] };
    const result = validatePackage(buildFiles({ templates: { home: template, page: validTemplate('page'), postList: validTemplate('postList'), post: validTemplate('post') } }));
    expect(result.ok).toBe(false);
  });

  it('rejects missing/extra content slots', () => {
    const noSlot = { ...validTemplate('home'), sections: [] };
    const twoSlots = { ...validTemplate('home'), sections: [{ type: 'content' }, { type: 'content' }] };
    for (const template of [noSlot, twoSlots]) {
      const result = validatePackage(buildFiles({ templates: { home: template, page: validTemplate('page'), postList: validTemplate('postList'), post: validTemplate('post') } }));
      expect(result.ok).toBe(false);
    }
  });

  it('rejects disallowed files and asset references that do not exist', () => {
    let result = validatePackage(buildFiles({ extra: [['scripts/main.js', 'alert(1)']] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('not part of the package format'))).toBe(true);

    const template = { ...validTemplate('home'), sections: [{ type: 'content' }, { type: 'static', block: { type: 'hero', title: 'T', image: 'assets/missing.png' } }] };
    result = validatePackage(buildFiles({ templates: { home: template, page: validTemplate('page'), postList: validTemplate('postList'), post: validTemplate('post') } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('Referenced asset'))).toBe(true);
  });

  it('rejects path traversal file names inside the archive', () => {
    const files = buildFiles();
    files.set('../evil.txt', new TextEncoder().encode('nope'));
    const result = validatePackage(files);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('traversal'))).toBe(true);
  });

  it('enforces file-count and size limits', () => {
    const many = buildFiles();
    for (let i = 0; i < 80; i += 1) many.set(`assets/extra${i}.png`, new Uint8Array(8));
    const result = validatePackage(many);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('Too many files'))).toBe(true);
  });

  it('compares semver correctly', () => {
    expect(compareSemver('1.2.0', '1.1.9')).toBeGreaterThan(0);
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('2.0.0-rc.1', '2.0.0')).toBe(0); // prerelease ignored in ordering
    expect(compareSemver('0.9.9', '1.0.0')).toBeLessThan(0);
  });
});

describe('zip reader/writer safety', () => {
  it('round-trips files byte-exactly', () => {
    const files = [
      { name: 'theme.json', data: new TextEncoder().encode('{"a":1}') },
      { name: 'templates/home.json', data: new TextEncoder().encode('x'.repeat(10_000)) },
      { name: 'assets/preview.png', data: new Uint8Array([137, 80, 78, 71]) },
    ];
    const zip = makeZip(files);
    const read = readZip(zip);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.entries.map((e) => e.name)).toEqual(files.map((f) => f.name));
      expect(read.entries[1].data.byteLength).toBe(10_000);
    }
  });

  it('rejects non-zip bytes', () => {
    expect(readZip(new TextEncoder().encode('not a zip at all')).ok).toBe(false);
    expect(readZip(new Uint8Array(4)).ok).toBe(false);
  });

  it('pack → validate → unpack → validate passes for the sample theme', () => {
    const files = loadSampleDir();
    const zip = makeZip([...files.entries()].map(([name, data]) => ({ name, data })));
    const read = readZip(zip);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const again = validatePackage(new Map(read.entries.map((e) => [e.name, e.data])));
    expect(again.ok).toBe(true);
  });
});

describe('css sanitizer + scoper', () => {
  it('scopes plain rules and media queries', () => {
    const result = sanitizeAndScopeThemeCss('h1 { color: red; }\n@media (min-width: 640px) { .card { padding: 2rem; } }', 'my-theme');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.css).toContain('.msp-theme-my-theme h1');
      expect(result.css).toContain('@media (min-width: 640px)');
      expect(result.css).toContain('.msp-theme-my-theme .card');
    }
  });

  it('rejects dangerous constructs', () => {
    for (const css of [
      '@import url("https://evil.example/x.css");',
      'body { background: url(https://evil.example/track); }',
      'a { behavior: url(evil.htc); }',
      'x { -moz-binding: url(evil.xml); }',
      '</style><script>alert(1)</script>',
      '.fixed { position: fixed; }',
    ]) {
      const result = sanitizeAndScopeThemeCss(css, 't');
      expect(result.ok, css).toBe(false);
    }
  });
});
