import type { Block, CategoryWithCount, Post } from './types';

/** Resolve the posts a `postlist` block refers to, from the site's posts. */
export function resolvePostlistPosts(
  block: Extract<Block, { type: 'postlist' }>,
  posts: Post[],
  categories?: CategoryWithCount[],
): Post[] {
  let result = posts;
  if (block.categorySlug) {
    const category = categories?.find((c) => c.slug === block.categorySlug);
    result = category ? posts.filter((p) => p.categoryId === category.id) : [];
  }
  return result.slice(0, block.limit ?? result.length);
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}
