import { requireAdmin } from '@/lib/admin/require-admin';
import { listThemes } from '@/platform/registry';
import { PageHeader } from '@/components/admin/PageHeader';
import { NewSiteForm } from '@/components/admin/NewSiteForm';

export const metadata = { title: 'New website' };

export default async function NewSitePage() {
  const actor = await requireAdmin();
  const themes = listThemes().map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
  }));

  return (
    <>
      <PageHeader
        title="Create a website"
        description="A new website starts with default branding and settings — everything is editable afterwards."
        crumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Websites', href: '/admin/sites' },
          { label: 'New' },
        ]}
      />
      {actor.role === 'SUPER_ADMIN' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <NewSiteForm themes={themes} />
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
          Only Super Admins can create websites.
        </p>
      )}
    </>
  );
}
