import type { Metadata } from 'next';
import './globals.css';

/**
 * Root layout: an HTML shell only. All rendering personality comes from the
 * active theme (fonts, colors, chrome), and per-site metadata is generated
 * per-request in the catch-all route.
 */
export const metadata: Metadata = {
  title: 'MultiSite Platform',
  description: 'One shared codebase serving multiple websites with their own themes and content.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
