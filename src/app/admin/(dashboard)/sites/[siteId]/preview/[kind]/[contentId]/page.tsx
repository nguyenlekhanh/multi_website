import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { getPageForAdmin, getPostForAdmin } from '@/lib/admin/content-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { isDataUnavailableError } from '@/platform/data/errors';
import { resolveThemeDefinition } from '@/lib/theme-package/store';
import type { SiteContext } from '@/platform/types';

/**
 * Authenticated, site-scoped content preview.
 *
 * Renders draft (or published) content through the site's active theme for
 * logged-in administrators with access to that site. This is the ONLY way to
 * view non-published content: there are no public query parameters, the page
 * is marked noindex, and everything renders dynamically (never cached).
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Preview',
  robots: { index: false, follow: false },
};

interface PreviewProps {
  params: Promise<{ siteId: string; kind: string; contentId: string }>;
}

export default async function ContentPreviewPage({ params }: PreviewProps) {
  let actor;
  try {
    actor = await requireAdmin();
  } catch {
    redirect('/admin/login');
  }
  const { siteId, kind, contentId } = await params;
  if (kind !== 'page' && kind !== 'post') notFound();

  let site;
  try {
    const siteResult = await getSiteForAdmin(actor, siteId);
    if (!siteResult.ok) notFound();
    site = siteResult.data;
  } catch (error) {
    if (isDataUnavailableError(error)) notFound();
    throw error;
  }

  const numericId = Number(contentId);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const ctx: SiteContext = {
    site: {
      id: site.id,
      name: site.name,
      domain: site.primaryDomain ?? site.id,
      domains: site.domains.map((d) => d.host),
      themeId: site.themeId,
      settings: site.settings,
      createdAt: '1970-01-01T00:00:00.000Z',
      updatedAt: site.updatedAt,
    },
    settings: site.settings,
    effectiveThemeId: site.themeId,
    origin: `https://${site.primaryDomain ?? site.id}`,
    preview: true,
  };
  const theme = await resolveThemeDefinition(ctx.effectiveThemeId);

  let content: React.ReactNode;
  let status: string;
  if (kind === 'page') {
    const result = await getPageForAdmin(actor, siteId, numericId);
    if (!result.ok) notFound();
    status = result.data.status;
    const PageView = theme.page;
    content = <PageView ctx={ctx} page={result.data as never} posts={[]} categories={[]} />;
  } else {
    const result = await getPostForAdmin(actor, siteId, numericId);
    if (!result.ok) notFound();
    status = result.data.status;
    if (!theme.post) notFound();
    const PostView = theme.post;
    content = <PostView ctx={ctx} post={result.data as never} related={[]} />;
  }

  return (
    <div className="bg-slate-950 min-h-screen" data-testid="content-preview">
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/95 px-4 py-2.5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          <span
            className={`mr-2 rounded-full px-2 py-0.5 ${
              status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {status}
          </span>
          Preview — only visible to authorized admins, not indexed by search engines.
        </p>
        <div className="flex items-center gap-3 text-xs">
          <Link href={`/admin/sites/${siteId}`} className="font-semibold text-sky-400 hover:underline">
            ← Back to admin
          </Link>
        </div>
      </div>
      {content}
    </div>
  );
}
