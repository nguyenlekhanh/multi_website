import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import type { CategoryWithCount, SiteContext } from '@/platform/types';

/** Travel theme — categories index: large serif topic pills. */
export function TravelCategories({ categories }: { ctx: SiteContext; categories: CategoryWithCount[] }) {
  return (
    <>
      <section className="t-bg-muted border-b t-border">
        <Container className="py-16 text-center sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.22em] t-text-accent">Travel journal</p>
          <h1 className="mx-auto mt-3 max-w-2xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            Stories by theme
          </h1>
        </Container>
      </section>
      <section className="py-14 sm:py-16">
        <Container>
          <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/posts?category=${category.slug}`}
                className="group rounded-full border t-border px-6 py-3 transition hover:border-[var(--c-primary)] hover:shadow-md t-ring"
              >
                <span className="font-serif text-xl font-bold tracking-tight group-hover:text-[var(--c-primary)]">
                  {category.name}
                </span>
                <span className="ml-2 text-sm t-text-muted">{category.postCount}</span>
              </Link>
            ))}
            {categories.length === 0 && <p className="t-text-muted">No themes yet.</p>}
          </div>
        </Container>
      </section>
    </>
  );
}
