import Link from 'next/link';
import { Container } from '@/components/shared/Container';

/** Blog theme — 404: typographic, editorial. */
export function BlogNotFound() {
  return (
    <Container className="py-24 text-center sm:py-32">
      <p className="font-serif text-7xl font-bold tracking-tight t-text-primary sm:text-8xl">404</p>
      <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        This page was never published
      </h1>
      <p className="mx-auto mt-4 max-w-md leading-relaxed t-text-muted">
        The essay you are looking for does not exist, or the link has a typo in it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
        <Link href="/" className="text-xs font-bold uppercase tracking-[0.18em] t-text-primary hover:underline t-ring rounded-sm">
          Front page
        </Link>
        <Link href="/posts" className="text-xs font-bold uppercase tracking-[0.18em] t-text-muted hover:text-[var(--c-fg)] t-ring rounded-sm">
          All essays
        </Link>
      </div>
    </Container>
  );
}
