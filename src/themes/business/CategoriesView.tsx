import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import type { CategoryWithCount, SiteContext } from '@/platform/types';

/** Business theme — categories index: topic cards. */
export function BusinessCategories({ categories }: { ctx: SiteContext; categories: CategoryWithCount[] }) {
  return (
    <>
      <section className="t-bg-muted border-b t-border">
        <Container className="py-14 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] t-text-accent">Insights</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Browse by topic</h1>
          <p className="mt-4 max-w-2xl text-lg t-text-muted">
            Every article we publish, organized by the practice it belongs to.
          </p>
        </Container>
      </section>
      <section className="py-14 sm:py-16">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/posts?category=${category.slug}`}
                className="group rounded-xl border t-border p-6 transition hover:border-[var(--c-accent)] hover:shadow-md t-ring"
              >
                <p className="text-3xl font-bold tracking-tight t-text-primary">{category.postCount}</p>
                <h2 className="mt-2 text-lg font-semibold group-hover:text-[var(--c-primary)]">{category.name}</h2>
                <p className="mt-1 text-sm t-text-muted">
                  {category.postCount} {category.postCount === 1 ? 'article' : 'articles'}
                </p>
              </Link>
            ))}
            {categories.length === 0 && <p className="t-text-muted">No topics yet.</p>}
          </div>
        </Container>
      </section>
    </>
  );
}
