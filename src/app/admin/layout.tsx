import type { Metadata } from 'next';
import '../globals.css';

/**
 * Admin shell. Authentication happens per-page/per-action inside the
 * (dashboard) route group — the login page lives outside it and must stay
 * reachable while signed out.
 */
export const metadata: Metadata = {
  title: { default: 'Platform Admin', template: '%s · Platform Admin' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
