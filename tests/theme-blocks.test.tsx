import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Block } from '@/platform/types';
import { AgencyBlocks } from '@/themes/agency/Blocks';
import { NewsBlocks } from '@/themes/news/Blocks';
import { PortfolioBlocks } from '@/themes/portfolio/Blocks';
import { TechBlocks } from '@/themes/it/Blocks';

/**
 * Block-compatibility tests: every Phase 5 theme must render every typed
 * content block from the CMS without crashing, must degrade unsupported or
 * empty blocks to nothing, and must expose the block's content to the page.
 *
 * The themes render through react-dom/server (they are pure server
 * components; client islands used here contain no hooks).
 */

const sampleBlocks: Block[] = [
  {
    type: 'hero',
    eyebrow: 'Eyebrow',
    title: 'Hero title',
    subtitle: 'Hero subtitle',
    image: '/images/blog/desk.jpg',
    imageAlt: 'Hero image',
    primaryCta: { label: 'Primary', href: '/contact' },
    secondaryCta: { label: 'Secondary', href: '/about' },
  },
  { type: 'logos', heading: 'Trusted by', items: ['Acme', 'Globex'] },
  {
    type: 'intro',
    eyebrow: 'Intro',
    heading: 'Intro heading',
    body: ['Paragraph one.', 'Paragraph two.'],
    image: '/images/blog/library.jpg',
    imageAlt: 'Intro image',
    bullets: ['Bullet one', 'Bullet two'],
  },
  {
    type: 'features',
    eyebrow: 'Features',
    heading: 'Features heading',
    intro: 'Features intro',
    items: [{ icon: 'zap', title: 'Feature one', description: 'Does things.' }],
  },
  {
    type: 'cards',
    eyebrow: 'Cards',
    heading: 'Cards heading',
    intro: 'Cards intro',
    items: [
      {
        title: 'Card one',
        description: 'Card description',
        image: '/images/blog/desk.jpg',
        imageAlt: 'Card image',
        href: '/contact',
        meta: ['Meta 1'],
        tag: 'New',
      },
    ],
  },
  { type: 'stats', items: [{ value: '99.9%', label: 'uptime' }] },
  {
    type: 'testimonials',
    eyebrow: 'Testimonials',
    heading: 'Testimonials heading',
    items: [{ quote: 'Great work.', author: 'Client', role: 'CEO', initials: 'CL' }],
  },
  {
    type: 'cta',
    heading: 'CTA heading',
    body: 'CTA body',
    buttonLabel: 'Go',
    buttonHref: '/contact',
  },
  { type: 'richtext', eyebrow: 'Rich', heading: 'Rich heading', paragraphs: ['Paragraph.'] },
  {
    type: 'contact',
    heading: 'Contact heading',
    body: ['Line.'],
    email: 'hello@example.com',
    phone: '+1 555 0100',
    address: '1 Main St',
    hours: '9–5',
  },
  { type: 'postlist', heading: 'Latest', limit: 5 },
];

const themeRenderers = [
  { name: 'portfolio', Blocks: PortfolioBlocks },
  { name: 'news', Blocks: NewsBlocks },
  { name: 'it', Blocks: TechBlocks },
  { name: 'agency', Blocks: AgencyBlocks },
];

const samplePosts = [
  {
    siteId: 'test-site',
    slug: 'sample-post',
    title: 'Sample post title',
    excerpt: 'Sample post excerpt',
    body: ['Post paragraph.'],
    coverImage: '/images/blog/desk.jpg',
    coverAlt: 'Post cover',
    categoryId: 'cat-1',
    tags: [],
    author: { id: 'a1', name: 'Author Name', initials: 'AN' },
    publishedAt: '2026-01-15T08:00:00.000Z',
    readingMinutes: 4,
    status: 'PUBLISHED',
  } as never,
];

const sampleCategories = [
  { id: 'cat-1', siteId: 'test-site', slug: 'sample', name: 'Sample', postCount: 1 },
];

describe.each(themeRenderers)('$name theme block compatibility', ({ Blocks }) => {
  it('renders every supported content block type', () => {
    const html = renderToStaticMarkup(
      Blocks({ blocks: sampleBlocks, posts: samplePosts, categories: sampleCategories }),
    );
    expect(html).toContain('Hero title');
    expect(html).toContain('Intro heading');
    expect(html).toContain('Feature one');
    expect(html).toContain('Card one');
    expect(html).toContain('99.9%');
    expect(html).toContain('Great work.');
    expect(html).toContain('CTA heading');
    expect(html).toContain('Rich heading');
    expect(html).toContain('Contact heading');
    // postlist resolves against the passed posts
    expect(html).toContain('Sample post title');
  });

  it('renders empty block lists to nothing', () => {
    expect(renderToStaticMarkup(Blocks({ blocks: [] }))).toBe('');
  });

  it('renders a page with no posts without a postlist section', () => {
    const html = renderToStaticMarkup(Blocks({ blocks: sampleBlocks.filter((b) => b.type !== 'postlist') }));
    expect(html).not.toContain('Sample post title');
  });

  it('does not execute unknown block payloads (graceful skip)', () => {
    const html = renderToStaticMarkup(
      Blocks({
        blocks: [...sampleBlocks, { type: 'not-a-real-type' } as unknown as Block],
        posts: samplePosts,
        categories: sampleCategories,
      }),
    );
    expect(html).toContain('Hero title');
  });
});
