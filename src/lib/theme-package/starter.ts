import { deflateSync } from 'node:zlib';
import {
  NATIVE_THEME_IDS,
  PLATFORM_BLOCKS,
  THEME_FORMAT,
  THEME_FORMAT_VERSION,
  THEME_ID_PATTERN,
} from './spec';

/**
 * Theme Starter Kit scaffold — the "theme:new" engine.
 *
 * A pure function (no fs, no Next runtime) that produces a complete,
 * validator-clean MSP Theme Package v1 file map from a theme name. The CLI
 * (scripts/theme-new.ts) writes it to disk; tests validate it directly.
 *
 * Everything generated here is intentionally boring and correct: exactly one
 * content slot per template, all referenced blocks declared, CSS that passes
 * the sanitizer, and a deterministic placeholder preview image.
 */

export interface StarterKitInput {
  /** Display name, e.g. "Coastal Retreat". */
  name: string;
  /** Optional id override; defaults to a slugified name. */
  slug?: string;
  /** Optional description (10–400 chars); a sensible default is generated. */
  description?: string;
  /** Optional author name (manifest requires one). */
  authorName?: string;
  /** Optional author URL — must be https:// if provided. */
  authorUrl?: string;
}

export type StarterKitResult =
  | { ok: true; slug: string; files: Map<string, Uint8Array> }
  | { ok: false; error: string };

const RESERVED_SLUGS = new Set<string>(NATIVE_THEME_IDS);

/** "My Great Theme!" → "my-great-theme" (or null when nothing usable remains). */
export function slugifyThemeName(raw: string): string | null {
  const slug = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug === '' ? null : slug;
}

const json = (value: unknown): Uint8Array =>
  new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);

const text = (value: string): Uint8Array => new TextEncoder().encode(value);

/* --------------------------- placeholder preview --------------------------- */

/** Deterministic hue from the slug so every starter gets a distinct preview. */
function hashHue(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % 360;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Minimal dependency-free PNG writer (RGB, no interlace) for the preview. */
function makePreviewPng(slug: string): Uint8Array {
  const W = 480;
  const H = 300;
  const hue = hashHue(slug);
  const top = hslToRgb(hue, 0.55, 0.42);
  const bottom = hslToRgb((hue + 40) % 360, 0.45, 0.62);

  const raw = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y += 1) {
    const t = y / (H - 1);
    const r = Math.round(top[0] + (bottom[0] - top[0]) * t);
    const g = Math.round(top[1] + (bottom[1] - top[1]) * t);
    const b = Math.round(top[2] + (bottom[2] - top[2]) * t);
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  // A quiet "brand band" + three placeholder cards so it reads as a website.
  const rect = (x0: number, y0: number, x1: number, y1: number, c: [number, number, number]) => {
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y += 1) {
      for (let x = Math.max(0, x0); x < Math.min(W, x1); x += 1) {
        const i = (y * W + x) * 3;
        raw[i] = c[0];
        raw[i + 1] = c[1];
        raw[i + 2] = c[2];
      }
    }
  };
  const light = hslToRgb(hue, 0.3, 0.92);
  const card = hslToRgb(hue, 0.25, 0.8);
  rect(48, 96, 250, 104, light);
  rect(48, 116, 330, 124, light);
  rect(48, 140, 150, 168, light);
  for (let c = 0; c < 3; c += 1) rect(48 + c * 132, 190, 160 + c * 132, 262, card);

  const stride = W * 3;
  const scan = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y += 1) {
    scan[y * (stride + 1)] = 0;
    raw.copy(scan, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    let crc = 0xffffffff;
    for (const b of body) crc = crcTable[(crc ^ b) & 0xff]! ^ (crc >>> 8);
    const cb = Buffer.alloc(4);
    cb.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, body, cb]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(scan)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/* ------------------------------ scaffold body ------------------------------ */

function starterReadme(input: StarterKitInput, slug: string): string {
  return `# ${input.name} — MSP Theme Package v1

Generated by the Theme Starter Kit (\`npm run theme:new\`). This package is a
complete, valid starting point: it renders immediately and every file is safe
to edit.

## Structure

\`\`\`
${slug}/
├── theme.json           # Manifest: identity, layout chrome, entry points
├── templates/
│   ├── home.json        # Home route: static sections around the content slot
│   ├── page.json        # Generic page route
│   ├── post-list.json   # Journal index (grid/list options)
│   └── post.json        # Article detail (cover/author-card options)
├── styles/theme.css     # Scoped automatically to .msp-theme-${slug}
├── assets/preview.png   # Library thumbnail (placeholder — replace it)
└── README.md
\`\`\`

## How rendering works

Templates compose **static sections** (the platform's typed content blocks)
around exactly **one \`{ "type": "content" }\` slot**, which renders the
website's own CMS content:

- \`home\` / \`page\`: the CMS blocks of the homepage / inner page.
- \`postList\` / \`post\`: the journal index / a single article (shaped by the
  template \`options\`).

Packages are declarative data only — no JavaScript, no code execution. The
platform runtime renders everything through approved components, and
\`styles/theme.css\` is sanitized and namespaced to this theme.

## Workflow

\`\`\`bash
npm run theme:validate -- theme-packages/${slug}   # structural check
npm run theme:pack     -- theme-packages/${slug}   # build ${slug}.zip
\`\`\`

Then either upload the ZIP in **Admin → Theme library** (Super Admin) to
install it, or open **Admin → Preview lab** to render it with demo content
*without installing anything*. \`npm run theme:install -- theme-packages/${slug}.zip\`
installs from the CLI.

## Rules of the road

- Keep \`id\` stable across versions (it is the install identity).
- Bump \`version\` (semver) for every re-upload; downgrades are rejected.
- Declare every block you use in \`supportedBlocks\`.
- CSS limits: no \`@import\`, no \`url()\`, no \`position: fixed\`; ≤ 64 KB.
- Docs: docs/theme-package-v1.md · docs/theme-authoring-guide.md
`;
}

export function scaffoldStarterPackage(input: StarterKitInput): StarterKitResult {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: 'Theme name must be 2–80 characters.' };
  }
  const slug = (input.slug ? input.slug.trim() : slugifyThemeName(name)) ?? '';
  if (!THEME_ID_PATTERN.test(slug)) {
    return { ok: false, error: `Theme id "${slug}" must match ${THEME_ID_PATTERN.source} (lowercase kebab-case, 2–49 chars).` };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: `"${slug}" is a built-in native theme id — choose another.` };
  }
  const description = (input.description ?? `${name} — starter theme: hero, features, stats and journal sections, ready to customise.`).trim();
  if (description.length < 10 || description.length > 400) {
    return { ok: false, error: 'Description must be 10–400 characters.' };
  }
  const authorName = (input.authorName ?? 'Theme Author').trim();
  if (authorName.length < 2) return { ok: false, error: 'Author name must be at least 2 characters.' };
  if (input.authorUrl !== undefined && !/^https:\/\//.test(input.authorUrl)) {
    return { ok: false, error: 'Author URL must start with https://.' };
  }

  const files = new Map<string, Uint8Array>();

  files.set(
    'theme.json',
    json({
      format: THEME_FORMAT,
      formatVersion: THEME_FORMAT_VERSION,
      id: slug,
      name,
      version: '0.1.0',
      description,
      author: input.authorUrl ? { name: authorName, url: input.authorUrl } : { name: authorName },
      preview: 'assets/preview.png',
      compatibility: { platform: '1' },
      features: ['responsive', 'post-list', 'post-detail', 'seo'],
      supportedBlocks: [...PLATFORM_BLOCKS],
      entry: {
        templates: {
          home: 'templates/home.json',
          page: 'templates/page.json',
          postList: 'templates/post-list.json',
          post: 'templates/post.json',
        },
        styles: 'styles/theme.css',
      },
      layout: {
        header: { variant: 'logo-left-nav', sticky: true },
        footer: { variant: 'columns', showTagline: true },
        typography: { headingFont: 'sans', bodyFont: 'sans', displayScale: 1 },
        colors: { mode: 'brand' },
      },
    }),
  );

  files.set(
    'templates/home.json',
    json({
      route: 'home',
      contentHeader: { style: 'none', showEyebrow: false },
      sections: [
        {
          type: 'static',
          variant: 'centered',
          block: {
            type: 'hero',
            eyebrow: 'Welcome',
            title: `${name}`,
            subtitle: 'Replace this hero with your story: who you serve, and why it matters.',
            image: 'assets/preview.png',
            imageAlt: `${name} preview artwork`,
            primaryCta: { label: 'Get started', href: '/contact' },
            secondaryCta: { label: 'Learn more', href: '/about' },
          },
        },
        { type: 'content' },
        {
          type: 'static',
          variant: 'band',
          block: {
            type: 'stats',
            items: [
              { value: '10+', label: 'Years of experience' },
              { value: '250', label: 'Projects delivered' },
              { value: '98%', label: 'Client satisfaction' },
              { value: '24/7', label: 'Support' },
            ],
          },
        },
        {
          type: 'static',
          variant: 'panel',
          block: {
            type: 'cta',
            heading: 'Ready to begin?',
            body: 'Swap this call-to-action for your own conversion moment.',
            buttonLabel: 'Contact us',
            buttonHref: '/contact',
          },
        },
      ],
      options: { containerWidth: 'normal' },
    }),
  );

  files.set(
    'templates/page.json',
    json({
      route: 'page',
      contentHeader: { style: 'band', showEyebrow: true },
      sections: [
        { type: 'content' },
        {
          type: 'static',
          variant: 'banner',
          block: {
            type: 'cta',
            heading: 'Questions?',
            body: 'We answer every message within one business day.',
            buttonLabel: 'Get in touch',
            buttonHref: '/contact',
          },
        },
      ],
      options: { containerWidth: 'normal' },
    }),
  );

  files.set(
    'templates/post-list.json',
    json({
      route: 'postList',
      contentHeader: { style: 'none', showEyebrow: false },
      sections: [{ type: 'content' }],
      options: { postListLayout: 'grid', postListFeaturedFirst: true },
    }),
  );

  files.set(
    'templates/post.json',
    json({
      route: 'post',
      contentHeader: { style: 'none', showEyebrow: false },
      sections: [{ type: 'content' }],
      options: { postShowCover: true, postShowAuthorCard: true },
    }),
  );

  files.set(
    'styles/theme.css',
    text(`/* ${name} — starter styles. Scoped automatically to .msp-theme-${slug}.
   Rules: no @import, no url(), no position: fixed; 64 KB max. */

/* Gentle section rhythm */
main > section { padding-top: 3rem; padding-bottom: 3rem; }
@media (min-width: 640px) {
  main > section { padding-top: 4.5rem; padding-bottom: 4.5rem; }
}

/* Card hover lift */
a.group { transition: transform 0.2s ease, box-shadow 0.2s ease; }
a.group:hover { transform: translateY(-2px); }
`),
  );

  files.set('assets/preview.png', makePreviewPng(slug));
  files.set('README.md', text(starterReadme(input, slug)));

  return { ok: true, slug, files };
}
