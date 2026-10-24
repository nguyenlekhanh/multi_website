import Link from 'next/link';
import { Fragment } from 'react';

export interface Crumb {
  label: string;
  href?: string;
}

/** Page title block with breadcrumbs. */
export function PageHeader({
  title,
  description,
  crumbs,
  actions,
}: {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 text-sm text-slate-500">
          {crumbs.map((crumb, i) => (
            <Fragment key={`${crumb.label}-${i}`}>
              {i > 0 && <span aria-hidden="true" className="mx-1.5 text-slate-300">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-slate-700 hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-slate-600">
                  {crumb.label}
                </span>
              )}
            </Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function StatusPill({ status }: { status: 'ACTIVE' | 'INACTIVE' }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
