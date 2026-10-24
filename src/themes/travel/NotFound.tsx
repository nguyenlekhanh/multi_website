import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { TravelBlocks } from './Blocks';

/** Travel theme — 404. */
export function TravelNotFound() {
  return (
    <>
      <section className="py-24 text-center sm:py-32">
        <Container>
          <p className="font-serif text-7xl font-bold tracking-tight t-text-accent sm:text-8xl">404</p>
          <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            This trail doesn&apos;t exist
          </h1>
          <p className="mx-auto mt-4 max-w-md leading-relaxed t-text-muted">
            The page you are looking for has wandered off the map. Let&apos;s get you back on the route.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="t-btn t-bg-primary t-ring rounded-full px-6 py-3 text-sm font-semibold">
              Back to home
            </Link>
            <Link href="/destinations" className="t-btn t-btn-outline t-ring rounded-full px-6 py-3 text-sm font-semibold">
              Browse destinations
            </Link>
          </div>
        </Container>
      </section>
      <TravelBlocks
        blocks={[
          {
            type: 'cta',
            heading: 'Still dreaming?',
            body: 'Browse our destinations or write to us — every message gets a personal reply.',
            buttonLabel: 'Plan my trip',
            buttonHref: '/contact',
          },
        ]}
      />
    </>
  );
}
