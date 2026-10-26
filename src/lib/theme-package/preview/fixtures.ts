import type {
  Block,
  CategoryWithCount,
  Page,
  Post,
  SiteContext,
  SiteSettings,
} from '@/platform/types';

/**
 * Preview Lab demo fixtures.
 *
 * Representative, DB-free content handed to a theme instead of live site
 * data. Previewing never reads or writes site content — these fixtures are
 * the only content a preview lab render can show.
 */

export const DEMO_SETTINGS: SiteSettings = {
  identity: {
    name: 'Preview Lab Demo',
    tagline: 'Sample content for theme previews — not a real website.',
    logoText: 'Preview',
    logoInitials: 'PL',
  },
  colors: {
    primary: '#0F766E',
    primaryForeground: '#FFFFFF',
    accent: '#D97706',
    background: '#FDFDFB',
    foreground: '#1C1917',
    muted: '#F1EFEA',
    mutedForeground: '#6B7280',
    border: '#E7E5E0',
    dark: '#1C1917',
    darkForeground: '#FAFAF9',
  },
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Journal', href: '/posts' },
    { label: 'Contact', href: '/contact' },
  ],
  footerNav: [
    { label: 'About', href: '/about' },
    { label: 'Journal', href: '/posts' },
    { label: 'Contact', href: '/contact' },
  ],
  seo: {
    defaultTitle: 'Preview Lab Demo',
    titleTemplate: '%s · Preview Lab',
    description: 'Representative demo content used by the theme Preview Lab.',
    keywords: ['preview', 'theme'],
  },
};

/** SiteContext for a lab render. `themeId` is the theme being previewed. */
export function demoSiteContext(themeId: string): SiteContext {
  return {
    site: {
      id: 'preview-lab',
      name: 'Preview Lab Demo',
      domain: 'preview-lab.demo',
      domains: ['preview-lab.demo'],
      themeId,
      settings: DEMO_SETTINGS,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    settings: DEMO_SETTINGS,
    effectiveThemeId: themeId,
    origin: 'https://preview-lab.demo',
    preview: true,
  };
}

const DEMO_AUTHOR = {
  id: 'demo-author',
  name: 'Alex Rivera',
  role: 'Editor',
  bio: 'Writes about design systems and the craft of building for the web.',
  initials: 'AR',
};

const demoCover = (seed: string) => `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1200&q=60`;

export function demoCategories(): CategoryWithCount[] {
  return [
    { siteId: 'preview-lab', id: 'c1', slug: 'design', name: 'Design', postCount: 3 },
    { siteId: 'preview-lab', id: 'c2', slug: 'engineering', name: 'Engineering', postCount: 2 },
    { siteId: 'preview-lab', id: 'c3', slug: 'process', name: 'Process', postCount: 1 },
  ];
}

export function demoPosts(): Post[] {
  const categories = demoCategories();
  return [
    {
      siteId: 'preview-lab', slug: 'designing-with-constraints',
      title: 'Designing with constraints',
      excerpt: 'Why the best layouts start from a narrow set of rules — and how constraints make themes faster to ship.',
      body: [
        'Constraints are not the enemy of creativity; they are its scaffolding. A theme with a clear grid, two typefaces and a strict palette ships in days, not months.',
        'Start with the smallest set of decisions that can carry the whole design, then spend your energy on content and rhythm instead of reinventing buttons.',
      ],
      coverImage: demoCover('1517336714731-489689fd1ca8'),
      coverAlt: 'Design workspace with sketches',
      categoryId: categories[0]!.id, tags: ['design'],
      author: DEMO_AUTHOR,
      publishedAt: '2026-02-18T09:00:00.000Z', readingMinutes: 5, featured: true,
    },
    {
      siteId: 'preview-lab', slug: 'theme-architecture-notes',
      title: 'Theme architecture notes',
      excerpt: 'Separating layout chrome from content slots keeps every route predictable — here is the shape that works.',
      body: [
        'A theme is three things: a layout shell, route templates, and content slots. Everything else is styling.',
        'When a template needs a new section, it composes platform blocks; it never reaches into the data layer.',
      ],
      coverImage: demoCover('1461749280684-dccba630e2f6'),
      coverAlt: 'Code on a laptop screen',
      categoryId: categories[1]!.id, tags: ['engineering'],
      author: DEMO_AUTHOR,
      publishedAt: '2026-02-10T09:00:00.000Z', readingMinutes: 7,
    },
    {
      siteId: 'preview-lab', slug: 'shipping-preview-first',
      title: 'Shipping preview-first',
      excerpt: 'Preview every template with representative content before activation — the cheapest quality gate a platform can offer.',
      body: [
        'Activating a theme blind is how sites end up with unreadable heroes and broken journal pages.',
        'A preview lab turns theme selection from a leap of faith into a reviewable change.',
      ],
      categoryId: categories[2]!.id, tags: ['process'],
      author: DEMO_AUTHOR,
      publishedAt: '2026-01-28T09:00:00.000Z', readingMinutes: 4,
    },
    {
      siteId: 'preview-lab', slug: 'typography-that-works',
      title: 'Typography that works everywhere',
      excerpt: 'Choosing heading and body pairings that survive dark bands, overlay heroes and narrow containers.',
      body: [
        'Good theme typography is measured in ranges, not points: a display scale, a reading measure, and a muted meta style.',
      ],
      categoryId: categories[0]!.id,
      author: DEMO_AUTHOR,
      publishedAt: '2026-01-14T09:00:00.000Z', readingMinutes: 6,
    },
    {
      siteId: 'preview-lab', slug: 'grid-systems-for-journals',
      title: 'Grid systems for journals',
      excerpt: 'Card grids, featured-first layouts and list rows — when each journal pattern earns its place.',
      body: [
        'Grid cards flatter visual posts; list rows respect dense, texty archives; featured-first gives the newest story room to breathe.',
      ],
      coverImage: demoCover('1499750310107-5fef28a66643'),
      coverAlt: 'Notebook and coffee on a desk',
      categoryId: categories[1]!.id,
      author: DEMO_AUTHOR,
      publishedAt: '2026-01-06T09:00:00.000Z', readingMinutes: 5,
    },
    {
      siteId: 'preview-lab', slug: 'colors-and-contrast',
      title: 'Colors and contrast that pass review',
      excerpt: 'Brand palettes are inputs, not outputs — check every band and button against the text that sits on it.',
      body: [
        'Every theme inherits the site palette, so contrast is a shared responsibility between the palette and the theme surface choices.',
      ],
      categoryId: categories[0]!.id,
      author: DEMO_AUTHOR,
      publishedAt: '2025-12-20T09:00:00.000Z', readingMinutes: 3,
    },
  ];
}

export function demoPost(): Post {
  return demoPosts()[0]!;
}

export function demoRelatedPosts(): Post[] {
  return demoPosts().slice(1, 4);
}

/** Homepage demo content: a representative mix of CMS-managed blocks. */
export function demoHomepage(): Page {
  const blocks: Block[] = [
    {
      type: 'intro',
      eyebrow: 'About the demo',
      heading: 'Content the platform actually serves',
      body: [
        'Every section below is a typed content block managed in the CMS — the theme only decides how it looks.',
        'Previewing with this mix shows how a theme handles real editorial variety: media, lists, quotes and data.',
      ],
      bullets: ['Typed blocks, validated on save', 'Per-site brand colors', 'No code in themes'],
      image: demoCover('1522542550221-31fd19575a2d'),
      imageAlt: 'Abstract gradient artwork',
    },
    {
      type: 'features',
      eyebrow: 'Capabilities',
      heading: 'What every theme must carry',
      intro: 'The platform guarantees these routes and surfaces for every site.',
      items: [
        { title: 'Home & pages', description: 'Composable sections around editable CMS content.', icon: 'globe' },
        { title: 'Journal', description: 'Category-aware post index with grid or list layouts.', icon: 'book' },
        { title: 'Articles', description: 'Cover, author card and related posts out of the box.', icon: 'spark' },
        { title: 'Contact', description: 'Structured contact details rendered consistently.', icon: 'mail' },
        { title: 'Responsive', description: 'Desktop-first layouts that fold cleanly to mobile.', icon: 'compass' },
        { title: 'Brand colors', description: 'Palettes flow from site settings into every surface.', icon: 'zap' },
      ],
    },
    {
      type: 'testimonials',
      eyebrow: 'Voices',
      heading: 'Quotes with real weight',
      items: [
        { quote: 'The preview lab caught a contrast problem we would never have seen in a mockup.', author: 'Priya Natarajan', role: 'Design lead', initials: 'PN' },
        { quote: 'Activating a theme used to be a gamble. Now it is a checklist.', author: 'Marco Feld', role: 'Agency owner', initials: 'MF' },
        { quote: 'Our editors publish without touching layout code at all.', author: 'Jules Verhoeven', role: 'Content manager', initials: 'JV' },
      ],
    },
    {
      type: 'logos',
      heading: 'Trusted by teams at',
      items: ['Northwind', 'Acme Corp', 'Globex', 'Initech', 'Umbrella'],
    },
  ];
  return {
    siteId: 'preview-lab', slug: 'home', title: 'Home', isHomepage: true,
    blocks, updatedAt: '2026-02-01T00:00:00.000Z',
  };
}

/** Inner "page" demo: prose-led content with structured contact details. */
export function demoInnerPage(): Page {
  return {
    siteId: 'preview-lab', slug: 'about', title: 'About the demo site', eyebrow: 'About',
    blocks: [
      {
        type: 'richtext',
        eyebrow: 'Why this page exists',
        heading: 'Prose is the hardest template to fake',
        paragraphs: [
          'Long-form text exposes weak typography faster than any hero section. This paragraph exists so you can judge measure, leading and muted styles on real content.',
          'Inner pages usually mix free prose with structured details — which is why the contact block below shows the same content as a card layout.',
        ],
      },
      {
        type: 'contact',
        heading: 'Talk to the demo team',
        body: ['This block renders structured contact details from the CMS.'],
        email: 'hello@preview-lab.demo',
        phone: '+1 (555) 010-0100',
        address: '100 Demo Street, Sampletown',
        hours: 'Mon–Fri, 9:00–17:00',
      },
    ],
    updatedAt: '2026-02-01T00:00:00.000Z',
  };
}

/**
 * The full platform block showcase — one of each of the 11 supported block
 * types, rendered through a theme's own `page` view.
 */
export function demoBlockShowcasePage(): Page {
  const blocks: Block[] = [
    { type: 'richtext', eyebrow: 'Block 1 of 11', heading: 'richtext', paragraphs: ['Plain editorial prose — the workhorse block for articles and explanations.'] },
    {
      type: 'hero', eyebrow: 'Block 2 of 11 · hero', title: 'The hero block',
      subtitle: 'A headline moment with optional eyebrow, subline and two calls-to-action.',
      primaryCta: { label: 'Primary action', href: '/contact' },
      secondaryCta: { label: 'Secondary action', href: '/about' },
    },
    {
      type: 'intro', eyebrow: 'Block 3 of 11 · intro', heading: 'Media + text introduction',
      body: ['Combines an image with a heading, paragraphs and optional bullet points.'],
      bullets: ['Optional bullets', 'Reversible media order'],
      image: demoCover('1498050108023-c5249f4df085'), imageAlt: 'Laptop with design work',
    },
    {
      type: 'features', eyebrow: 'Block 4 of 11 · features', heading: 'Feature grid',
      intro: 'Icon-led capability cards in a responsive grid.',
      items: [
        { title: 'Fast', description: 'Static-friendly rendering path.', icon: 'zap' },
        { title: 'Safe', description: 'Validated blocks, sanitized CSS.', icon: 'shield' },
        { title: 'Flexible', description: 'Per-site brand colors.', icon: 'spark' },
      ],
    },
    {
      type: 'cards', eyebrow: 'Block 5 of 11 · cards', heading: 'Card collection',
      intro: 'Image cards with optional tags, meta lines and links.',
      items: [
        { title: 'Coastal cottage', description: 'Three bedrooms, sea view.', tag: 'Featured', meta: ['€320k', '2 baths'], image: demoCover('1512917774080-9991f1c4c750'), imageAlt: 'House exterior' },
        { title: 'City loft', description: 'Open plan, top floor.', meta: ['€410k', '1 bath'], image: demoCover('1502672260266-1c1ef2d93688'), imageAlt: 'Loft interior' },
        { title: 'Garden studio', description: 'Work-from-home ready.', tag: 'New', image: demoCover('1416331108676-a22ccb276e35'), imageAlt: 'Garden studio' },
      ],
    },
    {
      type: 'stats',
      items: [
        { value: '120+', label: 'Projects shipped' },
        { value: '18', label: 'Countries served' },
        { value: '99.9%', label: 'Uptime' },
        { value: '4.9★', label: 'Client rating' },
      ],
    },
    {
      type: 'testimonials', eyebrow: 'Block 7 of 11 · testimonials', heading: 'What clients say',
      items: [
        { quote: 'The theme made our rebrand a one-afternoon job.', author: 'Dana Kim', role: 'CMO', initials: 'DK' },
        { quote: 'Blocks map one-to-one to what our editors already understand.', author: 'Sam Okafor', role: 'Head of Content', initials: 'SO' },
      ],
    },
    { type: 'logos', heading: 'Block 8 of 11 · logos', items: ['Northwind', 'Globex', 'Initech', 'Acme'] },
    { type: 'cta', heading: 'Block 9 of 11 · cta', body: 'A conversion moment with a single button.', buttonLabel: 'Get started', buttonHref: '/contact' },
    {
      type: 'contact', heading: 'Block 10 of 11 · contact',
      body: ['Structured details, no forms to fake.'],
      email: 'hello@preview-lab.demo', phone: '+1 (555) 010-0100', address: '100 Demo Street', hours: 'Mon–Fri 9–17',
    },
    { type: 'postlist', eyebrow: 'Block 11 of 11 · postlist', heading: 'Latest from the journal', intro: 'Dynamic: renders this site’s real posts.', limit: 3 },
  ];
  return {
    siteId: 'preview-lab', slug: 'blocks', title: 'Block showcase', eyebrow: 'Showcase',
    blocks, updatedAt: '2026-02-01T00:00:00.000Z',
  };
}
