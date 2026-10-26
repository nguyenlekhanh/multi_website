import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getPrisma } from '@/platform/data/prisma';
import { isDataUnavailableError } from '@/platform/data/errors';
import { listThemes } from '@/platform/registry';
import { PageHeader } from '@/components/admin/PageHeader';
import { PreviewLabUpload } from '@/components/admin/PreviewLab';

/**
 * Theme Preview Lab — entry page.
 *
 * Renders any theme (installed package, native theme, or an uploaded but
 * UNINSTALLED package) against representative demo content. Previews never
 * activate themes and never read or write site content.
 */

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Theme Preview Lab', robots: { index: false, follow: false } };

export default async function PreviewLabPage() {
  try {
    await requireAdmin();
  } catch {
    notFound();
  }

  const nativeThemes = listThemes().map((t) => ({ id: t.id, name: t.name, description: t.description }));

  const installed: { themeId: string; name: string; version: string }[] = [];
  let dbError = false;
  try {
    const rows = await getPrisma().themePackage.findMany({
      where: { status: 'CURRENT' },
      orderBy: { themeId: 'asc' },
      select: { themeId: true, name: true, version: true },
    });
    const seen = new Set<string>();
    for (const row of rows) {
      if (!seen.has(row.themeId)) {
        seen.add(row.themeId);
        installed.push(row);
      }
    }
  } catch (error) {
    if (isDataUnavailableError(error)) dbError = true;
    else throw error;
  }

  return (
    <>
      <PageHeader
        title="Theme Preview Lab"
        description="Render themes with representative demo content before committing to them: every template route, the full block vocabulary, and uninstalled ZIPs — without installing or activating anything."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Preview lab' }]}
      />

      <div className="space-y-8">
        <PreviewLabUpload />

        {dbError && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Database unavailable — installed packages can’t be listed. Upload a ZIP above instead.
          </p>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">Installed packages</h2>
          {installed.length === 0 && !dbError && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              No packages installed yet. Upload one above to preview it without installing.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {installed.map((theme) => (
              <Link
                key={theme.themeId}
                href={`/admin/themes/lab/preview/p_${theme.themeId}?template=home`}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <p className="font-semibold text-slate-900 group-hover:text-indigo-700">{theme.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  <code>package:{theme.themeId}</code> · v{theme.version}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-900">Native themes</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nativeThemes.map((theme) => (
              <Link
                key={theme.id}
                href={`/admin/themes/lab/preview/n_${theme.id}?template=home`}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <p className="font-semibold text-slate-900 group-hover:text-indigo-700">{theme.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{theme.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          <h2 className="font-semibold text-slate-900">What previews show</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li><strong>Home / Page / Post list / Post</strong> — all four template routes with demo pages, posts and categories.</li>
            <li><strong>Block showcase</strong> — all 11 platform content blocks rendered through the theme.</li>
            <li><strong>Variant gallery</strong> — packages only: every block variant the runtime renderer ships.</li>
            <li><strong>404</strong> — the theme’s not-found screen.</li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Previews use demo fixtures, never real site content. Active themes and site settings are untouched,
            and uninstalled packages expire from memory after 30 minutes.
          </p>
        </section>
      </div>
    </>
  );
}
