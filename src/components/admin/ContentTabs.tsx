import Link from 'next/link';
import { cn } from '@/components/shared/cn';

export type ContentTab = 'overview' | 'pages' | 'posts' | 'categories' | 'authors';

/** Sub-navigation for a site's Content section. */
export function ContentTabs({ siteId, active }: { siteId: string; active: ContentTab }) {
  const tabs: { key: ContentTab; label: string; href: string }[] = [
    { key: 'overview', label: 'Overview', href: `/admin/sites/${siteId}/content` },
    { key: 'pages', label: 'Pages', href: `/admin/sites/${siteId}/content/pages` },
    { key: 'posts', label: 'Posts', href: `/admin/sites/${siteId}/content/posts` },
    { key: 'categories', label: 'Categories', href: `/admin/sites/${siteId}/content/categories` },
    { key: 'authors', label: 'Authors', href: `/admin/sites/${siteId}/content/authors` },
  ];
  return (
    <nav className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Content">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? 'page' : undefined}
          className={cn(
            'rounded-lg px-3.5 py-2 text-sm font-medium transition',
            active === tab.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function StatusPill({ status }: { status: 'DRAFT' | 'PUBLISHED' }) {
  const published = status === 'PUBLISHED';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        published ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {published ? 'Published' : 'Draft'}
    </span>
  );
}
