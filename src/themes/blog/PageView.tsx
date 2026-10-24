import { Container } from '@/components/shared/Container';
import type { CategoryWithCount, Page, Post, SiteContext } from '@/platform/types';
import { BlogBlocks } from './Blocks';

/** Blog theme — generic CMS page: centered serif title over editorial blocks. */
export function BlogPageView({
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
      <section className="border-b t-border py-12 text-center sm:py-14">
        <div className="mx-auto max-w-2xl px-4">
          {page.eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-primary">{page.eyebrow}</p>
          )}
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight sm:text-5xl">{page.title}</h1>
        </div>
      </section>
      <Container className="py-8">
        <BlogBlocks blocks={page.blocks} posts={posts} categories={categories} />
      </Container>
    </>
  );
}
