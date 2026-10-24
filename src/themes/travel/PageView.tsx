import { Container } from '@/components/shared/Container';
import type { CategoryWithCount, Page, Post, SiteContext } from '@/platform/types';
import { TravelBlocks } from './Blocks';

/** Travel theme — generic CMS page: centered serif header band + block flow. */
export function TravelPageView({
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
        <Container className="py-16 text-center sm:py-20">
          {page.eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.22em] t-text-accent">{page.eyebrow}</p>
          )}
          <h1 className="mx-auto mt-3 max-w-2xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            {page.title}
          </h1>
        </Container>
      </section>
      <TravelBlocks blocks={page.blocks} posts={posts} categories={categories} />
    </>
  );
}
