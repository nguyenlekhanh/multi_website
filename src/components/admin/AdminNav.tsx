'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/shared/cn';

const links = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/sites', label: 'Websites', exact: false },
  { href: '/admin/ai', label: 'AI automation', exact: false },
  { href: '/admin/themes', label: 'Theme library', exact: true },
  { href: '/admin/themes/lab', label: 'Preview lab', exact: false },
  { href: '/admin/audit', label: 'Audit log', exact: false },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 py-3 max-lg:flex-row lg:flex-col" aria-label="Admin">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition max-lg:shrink-0',
              active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
