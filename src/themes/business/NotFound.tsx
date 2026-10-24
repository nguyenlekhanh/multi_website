import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { BusinessBlocks } from './Blocks';
import type { Block } from '@/platform/types';

/** Business theme — 404 view. */
export function BusinessNotFound() {
  return (
    <>
      <section className="py-24 sm:py-32">
        <Container className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] t-text-accent">Error 404</p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight sm:text-6xl">Page not found</h1>
          <p className="mx-auto mt-5 max-w-md text-lg t-text-muted">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="t-btn t-bg-primary t-ring rounded-md px-6 py-3 text-sm font-semibold">
              Back to home
            </Link>
            <Link href="/contact" className="t-btn t-btn-outline t-ring rounded-md px-6 py-3 text-sm font-semibold">
              Contact us
            </Link>
          </div>
        </Container>
      </section>
      <BusinessBlocks
        blocks={
          [
            {
              type: 'cta',
              heading: 'Looking for something specific?',
              body: 'Tell us what you need and the right person will point you to it.',
              buttonLabel: 'Get in touch',
              buttonHref: '/contact',
            },
          ] satisfies Block[]
        }
      />
    </>
  );
}
