import {
  BLOCK_VARIANTS,
  PLATFORM_BLOCKS,
  THEME_FORMAT,
  THEME_FORMAT_VERSION,
  type PackageTemplate,
  type PlatformBlockType,
  type ThemeManifest,
  type ValidatedThemePackage,
} from '../spec';

/**
 * Preview Lab block gallery — a synthetic, in-memory package that renders
 * every platform block type in every per-section variant the v1 renderer
 * ships, so authors can see the full vocabulary without installing anything.
 *
 * This package is never validated against file limits (there are no files);
 * it is constructed directly as a ValidatedThemePackage through the same
 * types the validator produces, and rendered by the ordinary renderer.
 */

const label = (block: string, variant?: string) =>
  variant ? `${block} · ${variant}` : block;

const RICHTEXT_LABEL_SECTION = (text: string): PackageTemplate['sections'][number] => ({
  type: 'static',
  block: {
    type: 'richtext',
    heading: text,
    paragraphs: ['Gallery marker section — each labelled block below it shows one renderer variant.'],
  },
});

function heroBlock(variant: string) {
  return {
    type: 'hero' as const,
    eyebrow: label('hero', variant),
    title: 'A headline moment',
    subtitle: 'Hero sections carry an eyebrow, a title, a subline and up to two calls-to-action.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=60',
    imageAlt: 'Bright office interior',
    primaryCta: { label: 'Primary action', href: '/contact' },
    secondaryCta: { label: 'Secondary', href: '/about' },
  };
}

function cardsBlock(variant: string) {
  return {
    type: 'cards' as const,
    eyebrow: label('cards', variant),
    heading: 'Card collection',
    intro: 'Image cards with tags, meta lines and optional links.',
    items: [
      { title: 'Alpine lodge', description: 'Sleeps six, sauna included.', tag: 'Featured', meta: ['€240/night', '3 beds'], image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=800&q=60', imageAlt: 'Lodge exterior' },
      { title: 'Lake cabin', description: 'Private dock, kayak access.', meta: ['€180/night', '2 beds'], image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=60', imageAlt: 'Cabin by a lake' },
      { title: 'Desert villa', description: 'Pool, stargazing deck.', tag: 'New', image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=60', imageAlt: 'Villa with pool' },
    ],
  };
}

function ctaBlock(variant: string) {
  return {
    type: 'cta' as const,
    heading: label('cta', variant),
    body: 'A conversion moment with a single button.',
    buttonLabel: 'Get started',
    buttonHref: '/contact',
  };
}

function gallerySections(): PackageTemplate['sections'] {
  const sections: PackageTemplate['sections'] = [];
  const unlabeled = new Set<PlatformBlockType>(['stats', 'logos', 'postlist']);

  for (const blockType of PLATFORM_BLOCKS) {
    for (const variant of BLOCK_VARIANTS[blockType]) {
      if (unlabeled.has(blockType)) {
        sections.push(RICHTEXT_LABEL_SECTION(label(blockType, variant)));
      }
      switch (blockType) {
        case 'hero':
          sections.push({ type: 'static', variant, block: heroBlock(variant) });
          break;
        case 'intro':
          sections.push({
            type: 'static',
            variant,
            block: {
              type: 'intro' as const,
              eyebrow: label('intro', variant),
              heading: 'Media and text',
              body: ['The intro block pairs an image with a heading, paragraphs and optional bullets.'],
              bullets: ['Optional bullet points', 'Media can flip sides'],
              image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=60',
              imageAlt: 'Meeting room',
            },
          });
          break;
        case 'features':
          sections.push({
            type: 'static',
            variant,
            block: {
              type: 'features' as const,
              eyebrow: label('features', variant),
              heading: 'Feature grid',
              intro: 'Capability cards in three presentations.',
              items: [
                { title: 'Fast', description: 'Lean, static-friendly rendering.', icon: 'zap' as const },
                { title: 'Safe', description: 'Validated blocks, sanitized CSS.', icon: 'shield' as const },
                { title: 'Friendly', description: 'Consistent, editable content.', icon: 'users' as const },
              ],
            },
          });
          break;
        case 'cards':
          sections.push({ type: 'static', variant, block: cardsBlock(variant) });
          break;
        case 'stats':
          sections.push({
            type: 'static',
            variant,
            block: {
              type: 'stats' as const,
              items: [
                { value: '42', label: 'Band/column variant' },
                { value: '1.2k', label: 'Items rendered' },
                { value: '11', label: 'Block types' },
                { value: '27', label: 'Variants shown' },
              ],
            },
          });
          break;
        case 'testimonials':
          sections.push({
            type: 'static',
            variant,
            block: {
              type: 'testimonials' as const,
              eyebrow: label('testimonials', variant),
              heading: 'Quiet voices',
              items: [
                { quote: 'The gallery showed us every option before we committed.', author: 'Ana Duarte', role: 'Studio lead', initials: 'AD' },
                { quote: 'Picking a card style took minutes, not meetings.', author: 'Ben Ito', role: 'Founder', initials: 'BI' },
                { quote: 'Every variant actually worked on mobile.', author: 'Chloe Marchetti', role: 'PM', initials: 'CM' },
              ],
            },
          });
          break;
        case 'richtext':
          sections.push({
            type: 'static',
            variant,
            block: {
              type: 'richtext' as const,
              eyebrow: label('richtext', variant),
              heading: 'Editorial prose',
              paragraphs: ['Richtext renders paragraphs in a measured column, with optional eyebrow and heading.'],
            },
          });
          break;
        case 'logos':
          sections.push({
            type: 'static',
            variant,
            block: { type: 'logos' as const, heading: label('logos', variant), items: ['Northwind', 'Globex', 'Initech', 'Acme', 'Umbrella'] },
          });
          break;
        case 'cta':
          sections.push({ type: 'static', variant, block: ctaBlock(variant) });
          break;
        case 'contact':
          sections.push({
            type: 'static',
            variant,
            block: {
              type: 'contact' as const,
              heading: label('contact', variant),
              body: ['Structured contact details rendered from the CMS.'],
              email: 'hello@preview-lab.demo',
              phone: '+1 (555) 010-0100',
              address: '100 Demo Street, Sampletown',
              hours: 'Mon–Fri, 9:00–17:00',
            },
          });
          break;
        case 'postlist':
          // Postlist presentation is driven by template options (grid/list +
          // featured-first), not per-section variants; the gallery shows the
          // grid form here and the journal route shows the rest.
          sections.push({
            type: 'static',
            block: {
              type: 'postlist' as const,
              heading: 'Latest articles',
              intro: 'Dynamic block — renders the site’s real posts.',
              limit: 3,
            },
          });
          break;
      }
    }
  }
  return sections;
}

function galleryManifest(): ThemeManifest {
  return {
    format: THEME_FORMAT,
    formatVersion: THEME_FORMAT_VERSION,
    id: 'preview-lab-gallery',
    name: 'Preview Lab Block Gallery',
    version: '1.0.0',
    description: 'Synthetic gallery package rendering every platform block and variant for theme authors.',
    author: { name: 'Platform Team' },
    compatibility: { platform: '1' },
    features: ['gallery', 'all-blocks', 'all-variants'],
    supportedBlocks: [...PLATFORM_BLOCKS],
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
      footer: { variant: 'minimal', showTagline: true },
      typography: { headingFont: 'sans', bodyFont: 'sans', displayScale: 1 },
      colors: { mode: 'brand' },
    },
  };
}

const PLAIN_TEMPLATE = (route: PackageTemplate['route']): PackageTemplate => ({
  route,
  contentHeader: { style: 'none', showEyebrow: false },
  sections: [{ type: 'content' }],
  options: {},
});

/** The synthetic gallery package (not installable; exists only in the lab). */
export function buildGalleryPackage(): ValidatedThemePackage {
  return {
    manifest: galleryManifest(),
    templates: {
      home: {
        route: 'home',
        contentHeader: { style: 'none', showEyebrow: false },
        sections: gallerySections(),
        options: { containerWidth: 'normal' },
      },
      page: PLAIN_TEMPLATE('page'),
      postList: { ...PLAIN_TEMPLATE('postList'), options: { postListLayout: 'grid' } },
      post: {
        ...PLAIN_TEMPLATE('post'),
        options: { postShowCover: true, postShowAuthorCard: true },
      },
    },
    css: '',
    stats: { fileCount: 0, totalBytes: 0 },
  };
}

/** Every label the gallery renders, in order — used by tests and the UI legend. */
export function galleryVariantLabels(): string[] {
  const labels: string[] = [];
  for (const blockType of PLATFORM_BLOCKS) {
    for (const variant of BLOCK_VARIANTS[blockType]) {
      labels.push(label(blockType, variant));
    }
  }
  return labels;
}
