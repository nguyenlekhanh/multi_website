'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from './cn';

/**
 * Navigation link with active-state awareness (client island so the rest of
 * a theme can stay on the server).
 */
export function NavLink({
  href,
  label,
  className,
  activeClassName,
}: {
  href: string;
  label: string;
  className?: string;
  activeClassName?: string;
}) {
  const pathname = usePathname();
  const base = href.split('?')[0] || '/';
  const active = base === '/' ? pathname === '/' : pathname === base || pathname.startsWith(`${base}/`);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(className, active && activeClassName)}
    >
      {label}
    </Link>
  );
}
