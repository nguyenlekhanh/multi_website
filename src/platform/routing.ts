import { db } from './data';
import type { CategoryWithCount, Page, Post, SiteContext } from './types';

/**
 * Platform routing table.
 *
 * Every site shares one content route contract (the dispatcher in
 * `app/[[...slug]]` maps URL paths to these kinds), while themes decide how
 * each kind is rendered. Themes cannot invent new routes; navigation comes
 * from site configuration pointing at these routes.
 *
 *   /                    → home
 *   /posts               → post list (optionally ?category=slug)
 *   /posts/{slug}        → single post
 *   /categories          → category index
 *   /{slug}              → CMS page (from site configuration)
 *   anything else        → not found
 */

export const RESERVED_SEGMENTS = new Set(['posts', 'categories', 'preview', 'api', '_next', 'images', 'favicon.ico']);

export type RouteKind =
  | { kind: 'home' }
  | { kind: 'page'; slug: string }
  | { kind: 'posts'; category?: string }
  | { kind: 'post'; slug: string }
  | { kind: 'categories' }
  | { kind: 'notFound'; requestedPath: string };

export function parseRoute(segments: string[] | undefined, searchParams?: URLSearchParams): RouteKind {
  const segs = segments ?? [];
  const category = searchParams?.get('category') ?? undefined;

  if (segs.length === 0) return { kind: 'home' };

  const [first, second] = segs;
  switch (first) {
    case 'posts':
      if (!second) return { kind: 'posts', category };
      if (segs.length === 2) return { kind: 'post', slug: second };
      return { kind: 'notFound', requestedPath: `/${segs.join('/')}` };
    case 'categories':
      if (!second) return { kind: 'categories' };
      return { kind: 'notFound', requestedPath: `/${segs.join('/')}` };
    default:
      if (segs.length === 1 && !RESERVED_SEGMENTS.has(first)) {
        return { kind: 'page', slug: first };
      }
      return { kind: 'notFound', requestedPath: `/${segs.join('/')}` };
  }
}

export interface ResolvedContent {
  page?: Page;
  post?: Post;
  posts?: Post[];
  relatedPosts?: Post[];
  categories?: CategoryWithCount[];
  activeCategory?: string;
  heading?: string;
}

/**
 * Load the content a route needs, strictly scoped to the resolved site.
 * The result is passed to the active theme as props.
 */
export async function loadRouteContent(ctx: SiteContext, route: RouteKind): Promise<ResolvedContent | null> {
  switch (route.kind) {
    case 'home': {
      const [page, posts, categories] = await Promise.all([
        db.getHomepage(ctx.site.id),
        db.listPosts(ctx.site.id),
        db.listCategories(ctx.site.id),
      ]);
      if (!page) return null;
      return { page, posts, categories };
    }
    case 'page': {
      const [page, posts, categories] = await Promise.all([
        db.getPage(ctx.site.id, route.slug),
        db.listPosts(ctx.site.id),
        db.listCategories(ctx.site.id),
      ]);
      if (!page) return null;
      return { page, posts, categories };
    }
    case 'posts': {
      const [posts, categories] = await Promise.all([
        db.listPosts(ctx.site.id, { categorySlug: route.category }),
        db.listCategories(ctx.site.id),
      ]);
      return { posts, categories, activeCategory: route.category };
    }
    case 'post': {
      const post = await db.getPost(ctx.site.id, route.slug);
      if (!post) return null;
      const related = await db.listRelatedPosts(ctx.site.id, post);
      return { post, relatedPosts: related };
    }
    case 'categories': {
      const categories = await db.listCategories(ctx.site.id);
      return { categories };
    }
    case 'notFound':
      return null;
  }
}
