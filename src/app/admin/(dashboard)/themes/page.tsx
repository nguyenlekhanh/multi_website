import { notFound } from 'next/navigation';
import { getPrisma } from '@/platform/data/prisma';
import { isDataUnavailableError } from '@/platform/data/errors';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { InstalledThemeCard, ThemeUploadForm } from '@/components/admin/ThemeLibrary';

export const metadata = { title: 'Theme library' };

export default async function ThemeLibraryPage() {
  const actor = await requireAdminSafe();
  const isSuper = actor?.role === 'SUPER_ADMIN';

  const themes: {
    themeId: string; name: string; description: string; version: string;
    authorName: string; status: 'CURRENT' | 'ARCHIVED'; updatedAt: string;
  }[] = [];
  const archived: Record<string, { version: string; updatedAt: string }[]> = {};
  let dbError = false;
  try {
    const rows = await getPrisma().themePackage.findMany({
      orderBy: [{ themeId: 'asc' }, { createdAt: 'desc' }],
    });
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.status === 'CURRENT' && !seen.has(row.themeId)) {
        seen.add(row.themeId);
        themes.push({
          themeId: row.themeId, name: row.name, description: row.description,
          version: row.version, authorName: row.authorName, status: row.status,
          updatedAt: row.updatedAt.toISOString(),
        });
      } else {
        (archived[row.themeId] ??= []).push({ version: row.version, updatedAt: row.updatedAt.toISOString() });
      }
    }
  } catch (error) {
    if (isDataUnavailableError(error)) dbError = true;
    else throw error;
  }

  return (
    <>
      <PageHeader
        title="Theme library"
        description="MSP theme packages (v1): declarative ZIP packages validated and rendered by the platform runtime. Built-in themes stay native."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Theme library' }]}
      />
      {dbError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Database unavailable.</p>
      ) : (
        <div className="space-y-6">
          {isSuper && <ThemeUploadForm />}
          {!isSuper && (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm t-text-muted">
              Installing, updating, rolling back, and uninstalling packages requires a Super Admin.
            </p>
          )}
          <section className="space-y-4">
            <h2 className="font-semibold text-slate-900">Installed packages</h2>
            {themes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="font-medium text-slate-600">No theme packages installed yet.</p>
                <p className="mt-1 text-sm text-slate-400">
                  Build one with <code className="rounded bg-slate-100 px-1">npm run theme:pack</code> (see
                  docs/theme-authoring-guide.md) and upload the ZIP above.
                </p>
              </div>
            ) : (
              themes.map((theme) => (
                <InstalledThemeCard key={theme.themeId} theme={theme} archivedVersions={archived[theme.themeId] ?? []} />
              ))
            )}
          </section>
        </div>
      )}
    </>
  );
}

async function requireAdminSafe() {
  try {
    return await requireAdmin();
  } catch {
    notFound();
  }
}
