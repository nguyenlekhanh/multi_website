import { notFound } from 'next/navigation';
import { getSiteForAdmin } from '@/lib/admin/sites-service';
import { requireAdmin } from '@/lib/admin/require-admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ThemePicker } from '@/components/admin/ThemePicker';
import { listThemes } from '@/platform/registry';

export const metadata = { title: 'Theme' };

export default async function SiteThemePage({ params }: { params: Promise<{ siteId: string }> }) {
  const actor = await requireAdmin();
  const { siteId } = await params;
  const result = await getSiteForAdmin(actor, siteId);
  if (!result.ok) notFound();
  const site = result.data;

  const themes = listThemes().map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    version: t.version,
    colors: {
      // Representative swatches from each theme's own defaults.
      primary: themeDefaults[t.id]?.primary ?? '#154D74',
      accent: themeDefaults[t.id]?.accent ?? '#C9973B',
      background: themeDefaults[t.id]?.background ?? '#FFFFFF',
    },
  }));

  return (
    <>
      <PageHeader
        title="Active theme"
        description={`Choose how ${site.name} is rendered. Themes are provided by the platform registry.`}
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: site.name, href: `/admin/sites/${site.id}` },
          { label: 'Theme' },
        ]}
      />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ThemePicker siteId={site.id} currentThemeId={site.themeId} themes={themes} />
      </div>
    </>
  );
}

/** Representative brand colors per theme for preview swatches. */
const themeDefaults: Record<string, { primary: string; accent: string; background: string }> = {
  business: { primary: '#154D74', accent: '#C9973B', background: '#FFFFFF' },
  travel: { primary: '#BC4B27', accent: '#0F766E', background: '#FFFCF7' },
  blog: { primary: '#B91C1C', accent: '#1F2937', background: '#FDFCF9' },
};
