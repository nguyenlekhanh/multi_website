import type { Page, SiteContext } from '@/platform/types';
import { BusinessBlocks } from './Blocks';

/**
 * Business theme — home.
 * The homepage is a normal page record; its block list defines the section
 * order (hero → logos → services → stats → intro → insights → testimonials
 * → CTA), and the theme decides how each block looks.
 */
export function BusinessHome({ page, posts, categories }: { ctx: SiteContext; page: Page; posts?: import('@/platform/types').Post[]; categories?: import('@/platform/types').CategoryWithCount[] }) {
  return <BusinessBlocks blocks={page.blocks} posts={posts} categories={categories} />;
}
