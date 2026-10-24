import Link from 'next/link';
import { ServiceUnavailable } from '@/components/preview/ServiceUnavailable';
import { isDataUnavailableError } from '@/platform/data';
import { resolveSite } from '@/platform/resolve';
import { getTheme } from '@/platform/registry';

/**
 * Global 404. Reached when a known site serves an unknown path — rendered
 * through the site's active theme so the 404 keeps the site's branding.
 * If no site resolves (unknown host), a generic platform page is shown;
 * database failures render the availability page without leaking internals.
 */
export default async function GlobalNotFound() {
  let ctx: Awaited<ReturnType<typeof resolveSite>>['ctx'] = null;
  try {
    ({ ctx } = await resolveSite());
  } catch (error) {
    if (isDataUnavailableError(error)) {
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
      console.error(
        `[platform] not-found render: data source unavailable.` +
          (cause ? ` Cause: ${cause}` : ''),
      );
      return <ServiceUnavailable />;
    }
    throw error;
  }

  if (!ctx) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
        <p className="font-mono text-sm text-slate-500">404</p>
        <h1 className="mt-3 text-3xl font-bold">Not found</h1>
        <p className="mt-3 max-w-md text-slate-400">
          This hostname isn&apos;t configured on the platform.
        </p>
        <Link href="/" className="mt-6 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950">
          Platform home
        </Link>
      </div>
    );
  }

  const theme = getTheme(ctx.effectiveThemeId);
  return (
    <theme.layout ctx={ctx}>
      <theme.notFound ctx={ctx} />
    </theme.layout>
  );
}
