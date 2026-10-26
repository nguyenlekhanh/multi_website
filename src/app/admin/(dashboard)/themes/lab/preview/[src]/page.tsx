import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getTheme, isRegisteredTheme } from '@/platform/registry';
import { isDataUnavailableError } from '@/platform/data/errors';
import { packageThemeDefinition } from '@/lib/theme-package/renderer';
import { getInstalledTheme } from '@/lib/theme-package/store';
import { buildGalleryPackage } from '@/lib/theme-package/preview/gallery';
import { getPreviewPackage } from '@/lib/theme-package/preview/store';
import {
  demoBlockShowcasePage,
  demoCategories,
  demoHomepage,
  demoInnerPage,
  demoPost,
  demoPosts,
  demoRelatedPosts,
  demoSiteContext,
} from '@/lib/theme-package/preview/fixtures';
import { PreviewToolbar, type PreviewToolbarMeta } from '@/components/admin/PreviewLab';
import type { SiteContext } from '@/platform/types';

/**
 * Theme Preview Lab — render surface.
 *
 * One route renders any theme against demo fixtures:
 *   u_<token>  staged uninstalled package (in-memory, 30 min TTL)
 *   p_<id>     installed theme package (rendered exactly as production)
 *   n_<id>     native registry theme
 *
 * Previews never activate themes, never read site content, and are visible
 * only to authenticated admins.
 */

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Preview',
  robots: { index: false, follow: false },
};

const BASE_TEMPLATES = ['home', 'page', 'postList', 'post', 'blocks'] as const;
const PACKAGE_TEMPLATES = [...BASE_TEMPLATES, 'gallery', 'notFound'] as const;
const NATIVE_TEMPLATES = [...BASE_TEMPLATES, 'notFound'] as const;

interface PreviewProps {
  params: Promise<{ src: string }>;
  searchParams: Promise<{ template?: string }>;
}

type Loaded =
  | { kind: 'uninstalled'; token: string; theme: ReturnType<typeof packageThemeDefinition>; meta: PreviewToolbarMeta; templates: readonly string[] }
  | { kind: 'installed'; theme: ReturnType<typeof packageThemeDefinition>; meta: PreviewToolbarMeta; templates: readonly string[] }
  | { kind: 'native'; theme: ReturnType<typeof getTheme>; meta: PreviewToolbarMeta; templates: readonly string[] };

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-3 text-sm text-slate-600">{children}</div>
      <Link
        href="/admin/themes/lab"
        className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        ← Back to the Preview Lab
      </Link>
    </div>
  );
}

export default async function ThemePreviewPage({ params, searchParams }: PreviewProps) {
  try {
    await requireAdmin();
  } catch {
    redirect('/admin/login');
  }

  const { src } = await params;
  const template = (await searchParams).template ?? 'home';

  let loaded: Loaded;
  if (src.startsWith('u_')) {
    const entry = getPreviewPackage(src.slice(2));
    if (!entry) {
      return (
        <div className="min-h-screen bg-white">
          <Notice title="Preview not found or expired">
            <p>Staged package previews are kept in memory for 30 minutes, then removed. Nothing was installed.</p>
          </Notice>
        </div>
      );
    }
    const theme = packageThemeDefinition(entry.pkg, {
      assetBasePath: `/api/theme-preview-assets/${entry.token}`,
    });
    loaded = {
      kind: 'uninstalled',
      token: entry.token,
      theme,
      meta: {
        name: entry.pkg.manifest.name,
        id: `package:${entry.pkg.manifest.id}`,
        version: entry.pkg.manifest.version,
        source: 'uninstalled',
      },
      templates: PACKAGE_TEMPLATES,
    };
  } else if (src.startsWith('p_')) {
    const themeId = src.slice(2);
    let pkg = null;
    try {
      pkg = await getInstalledTheme(themeId);
    } catch (error) {
      if (isDataUnavailableError(error)) {
        return (
          <div className="min-h-screen bg-white">
            <Notice title="Database unavailable">
              <p>Installed packages can’t be loaded right now. Upload the ZIP to preview it without the database.</p>
            </Notice>
          </div>
        );
      }
      throw error;
    }
    if (!pkg) {
      return (
        <div className="min-h-screen bg-white">
          <Notice title="Package not installed">
            <p>
              No installed package named <code className="rounded bg-slate-100 px-1">{themeId}</code>. You can still
              preview it by uploading the ZIP in the lab — that never installs anything.
            </p>
          </Notice>
        </div>
      );
    }
    loaded = {
      kind: 'installed',
      theme: packageThemeDefinition(pkg),
      meta: {
        name: pkg.manifest.name,
        id: `package:${pkg.manifest.id}`,
        version: pkg.manifest.version,
        source: 'installed',
      },
      templates: PACKAGE_TEMPLATES,
    };
  } else if (src.startsWith('n_')) {
    const themeId = src.slice(2);
    if (!isRegisteredTheme(themeId)) notFound();
    loaded = {
      kind: 'native',
      theme: getTheme(themeId),
      meta: { name: getTheme(themeId).name, id: themeId, source: 'native' },
      templates: NATIVE_TEMPLATES,
    };
  } else {
    notFound();
  }

  if (!(loaded.templates as readonly string[]).includes(template)) {
    return (
      <div className="min-h-screen bg-white">
        <Notice title="Template not available for this theme">
          <p>
            This preview supports:{' '}
            {loaded.templates.map((t, i) => (
              <span key={t}>
                {i > 0 ? ', ' : ''}
                <Link
                  href={`/admin/themes/lab/preview/${src}?template=${t}`}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  {t}
                </Link>
              </span>
            ))}
            .
          </p>
        </Notice>
      </div>
    );
  }

  const gallery = template === 'gallery';
  // SiteContext carries the same theme reference production would resolve
  // (`package:<id>` or a native id); demo fixtures provide everything else.
  const ctx: SiteContext = demoSiteContext(loaded.meta.id);
  const posts = demoPosts();
  const categories = demoCategories();

  const ActiveTheme = gallery ? packageThemeDefinition(buildGalleryPackage()) : loaded.theme;

  let view: React.ReactNode;
  switch (gallery ? 'gallery' : template) {
    case 'home':
      view = <ActiveTheme.home ctx={ctx} page={demoHomepage()} posts={posts} categories={categories} />;
      break;
    case 'page':
      view = <ActiveTheme.page ctx={ctx} page={demoInnerPage()} posts={posts} categories={categories} />;
      break;
    case 'postList':
      if (!ActiveTheme.postList) {
        view = (
          <Notice title="No post-list template">
            <p>This theme does not implement a journal index view.</p>
          </Notice>
        );
      } else {
        view = <ActiveTheme.postList ctx={ctx} posts={posts} categories={categories} />;
      }
      break;
    case 'post':
      if (!ActiveTheme.post) {
        view = (
          <Notice title="No post template">
            <p>This theme does not implement an article view.</p>
          </Notice>
        );
      } else {
        view = <ActiveTheme.post ctx={ctx} post={demoPost()} related={demoRelatedPosts()} categories={categories} />;
      }
      break;
    case 'blocks':
      view = <ActiveTheme.page ctx={ctx} page={demoBlockShowcasePage()} posts={posts} categories={categories} />;
      break;
    case 'gallery':
      view = (
        <ActiveTheme.home
          ctx={ctx}
          page={{
            siteId: 'preview-lab', slug: 'gallery', title: 'Block gallery',
            blocks: [{
              type: 'richtext',
              heading: 'Variant gallery',
              paragraphs: [
                'Every platform block type in every per-section variant the package renderer ships. The journal (postlist) presentations are driven by template options and are shown on the Post list tab of each theme.',
              ],
            }],
            updatedAt: new Date().toISOString(),
          }}
          posts={posts}
          categories={categories}
        />
      );
      break;
    case 'notFound':
      view = <ActiveTheme.notFound ctx={ctx} />;
      break;
    default:
      notFound();
  }

  return (
    <PreviewToolbar
      src={src}
      current={template}
      templates={loaded.templates}
      meta={gallery ? { ...loaded.meta, name: `${loaded.meta.name} — variant gallery`, source: 'gallery' } : loaded.meta}
    >
      {view}
    </PreviewToolbar>
  );
}
