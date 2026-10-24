import type { CategoryWithCount, Page, Post, SiteContext } from '@/platform/types';
import { TravelBlocks } from './Blocks';

/** Travel theme — home. Blocks flow; the hero runs full-bleed under the header. */
export function TravelHome({
  page,
  posts,
  categories,
}: {
  ctx: SiteContext;
  page: Page;
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  return <TravelBlocks blocks={page.blocks} posts={posts} categories={categories} />;
}
