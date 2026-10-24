import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import type { CategoryWithCount, SiteContext } from '@/platform/types';

/** Blog theme — categories index: editorial ruled list. */
export function BlogCategories({ categories }: { ctx: SiteContext; categories: CategoryWithCount[] }) {
  return (
    <Container className="py-12">
      <div className="border-b-2 border-b-[var(--c-fg)] pb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] t-text-primary">Browse</p>
        <h1 className="mt-1 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Categories</h1>
        <p className="mt-3 max-w-xl t-text-muted">
          Every essay in the archive, sorted by desk.
        </p>
      </div>
      <ul>
        {categories.map((category) => (
          <li key={category.id} className="border-b t-border py-6">
            <Link href={`/posts?category=${category.slug}`} className="group flex items-baseline justify-between gap-4 t-ring rounded-sm">
              <span className="font-serif text-2xl font-bold tracking-tight group-hover:t-text-primary transition-colors">
                {category.name}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] t-text-muted">
                {category.postCount} {category.postCount === 1 ? 'essay' : 'essays'}
              </span>
            </Link>
          </li>
        ))}
        {categories.length === 0 && <li className="py-6 text-sm t-text-muted">No categories yet.</li>}
      </ul>
    </Container>
  );
}
