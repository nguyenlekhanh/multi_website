import { Container } from '@/components/shared/Container';
import type { CategoryWithCount, Page, Post, SiteContext } from '@/platform/types';
import { BusinessBlocks } from './Blocks';

/** Business theme — generic CMS page: quiet header band + block flow. */
export function BusinessPageView({
  page,
  posts,
  categories,
}: {
  ctx: SiteContext;
  page: Page;
  posts?: Post[];
  categories?: CategoryWithCount[];
}) {
  return (
    <>
      <section className="t-bg-muted border-b t-border">
        <Container className="py-14 sm:py-16">
          {page.eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">{page.eyebrow}</p>
          )}
          <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{page.title}</h1>
        </Container>
      </section>
      <BusinessBlocks blocks={page.blocks} posts={posts} categories={categories} />
    </>
  );
}
