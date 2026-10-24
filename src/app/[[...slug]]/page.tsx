import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { DevBar } from '@/components/preview/DevBar';
import { PlatformLanding } from '@/components/preview/PlatformLanding';
import { ServiceUnavailable } from '@/components/preview/ServiceUnavailable';
import { db, isDataUnavailableError } from '@/platform/data';
import { getTheme, isRegisteredTheme, listThemes } from '@/platform/registry';
import { resolveSite } from '@/platform/resolve';
import { buildMetadata, metadataForPage, metadataForPost } from '@/platform/seo';
import { loadRouteContent, parseRoute } from '@/platform/routing';
import type { SiteContext } from '@/platform/types';

/**
 * Site dispatcher.
 *
 * A single optional catch-all serves every website on every mapped hostname:
 * resolve the site (middleware-stamped headers) → parse the platform route
 * → load content scoped to that site → hand everything to the active theme.
 * Unknown hostnames render the platform landing page (the dev preview
 * selector); unknown paths render the active theme's 404; database failures
 * render a branded availability page (never seed content, never raw errors).
 */

interface RouteParams {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toURLSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') sp.set(key, value);
    else if (Array.isArray(value) && value[0] !== undefined) sp.set(key, value[0]);
  }
  return sp;
}

function logUnavailable(error: unknown, context: string) {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
  console.error(
    `[platform] ${context}: the configured data source is unavailable. ` +
      'Check DATABASE_URL / DATA_SOURCE and database connectivity.' +
      (cause ? ` Cause: ${cause}` : ''),
  );
}

export async function generateMetadata({ params, searchParams }: RouteParams): Promise<Metadata> {
  const route = parseRoute((await params).slug, toURLSearchParams(await searchParams));
  try {
    const { ctx } = await resolveSite();
    if (!ctx) {
      return {
        title: 'MultiSite Platform',
        description: 'One shared codebase serving multiple websites with their own themes and content.',
      };
    }

    switch (route.kind) {
      case 'home': {
        const page = await db.getHomepage(ctx.site.id);
        return page ? metadataForPage(ctx, page) : buildMetadata({ ctx, path: '/' });
      }
      case 'page': {
        const page = await db.getPage(ctx.site.id, route.slug);
        return page
          ? metadataForPage(ctx, page)
          : buildMetadata({ ctx, title: 'Page not found', path: `/${route.slug}` });
      }
      case 'posts': {
        const title = route.category ? `Articles in ${route.category}` : 'Journal';
        return buildMetadata({ ctx, title, path: '/posts' });
      }
      case 'post': {
        const post = await db.getPost(ctx.site.id, route.slug);
        return post
          ? metadataForPost(ctx, post)
          : buildMetadata({ ctx, title: 'Page not found', path: `/posts/${route.slug}` });
      }
      case 'categories':
        return buildMetadata({ ctx, title: 'Categories', path: '/categories' });
      case 'notFound':
        return buildMetadata({ ctx, title: 'Page not found', path: route.requestedPath });
    }
  } catch (error) {
    if (isDataUnavailableError(error)) {
      logUnavailable(error, 'generateMetadata');
      return { title: 'Temporarily unavailable' };
    }
    throw error;
  }
}

export default async function SiteDispatcher({ params, searchParams }: RouteParams) {
  let ctx: Awaited<ReturnType<typeof resolveSite>>['ctx'];
  let host: string | null;
  try {
    ({ ctx, host } = await resolveSite());
  } catch (error) {
    if (isDataUnavailableError(error)) {
      logUnavailable(error, 'resolve site');
      return <ServiceUnavailable />;
    }
    throw error;
  }

  // Unknown hostname → platform landing page (fails safely, doubles as the
  // development preview selector).
  if (!ctx) {
    try {
      return <PlatformLanding host={host} />;
    } catch (error) {
      if (isDataUnavailableError(error)) {
        logUnavailable(error, 'platform landing');
        return <ServiceUnavailable />;
      }
      throw error;
    }
  }

  const route = parseRoute((await params).slug, toURLSearchParams(await searchParams));
  const theme = getTheme(ctx.effectiveThemeId);

  // Unknown route → the active theme's 404 (rendered by app/not-found.tsx).
  if (route.kind === 'notFound') notFound();

  let content: Awaited<ReturnType<typeof loadRouteContent>>;
  try {
    content = await loadRouteContent(ctx, route);
  } catch (error) {
    if (isDataUnavailableError(error)) {
      logUnavailable(error, `load content for site "${ctx.site.id}"`);
      return <ServiceUnavailable />;
    }
    throw error;
  }
  if (!content) notFound();

  let view: ReactNode;
  switch (route.kind) {
    case 'home':
      view = (
        <theme.home ctx={ctx} page={content.page!} posts={content.posts} categories={content.categories} />
      );
      break;
    case 'page':
      view = (
        <theme.page ctx={ctx} page={content.page!} posts={content.posts} categories={content.categories} />
      );
      break;
    case 'posts':
      if (!theme.postList) notFound();
      view = (
        <theme.postList
          ctx={ctx}
          posts={content.posts ?? []}
          categories={content.categories ?? []}
          activeCategory={content.activeCategory}
        />
      );
      break;
    case 'post':
      if (!theme.post) notFound();
      view = <theme.post ctx={ctx} post={content.post!} related={content.relatedPosts ?? []} />;
      break;
    case 'categories':
      if (!theme.categories) notFound();
      view = <theme.categories ctx={ctx} categories={content.categories ?? []} />;
      break;
  }

  return (
    <>
      <theme.layout ctx={ctx}>
        {view}
        <DevControls ctx={ctx} />
      </theme.layout>
    </>
  );
}

/** Dev-only floating preview bar; excluded from production bundles' render. */
async function DevControls({ ctx }: { ctx: SiteContext }) {
  if (process.env.NODE_ENV === 'production') return null;

  try {
    const [sites, themes] = await Promise.all([db.listSites(), Promise.resolve(listThemes())]);
    return (
      <DevBar
        siteId={ctx.site.id}
        siteName={ctx.site.name}
        currentThemeId={ctx.effectiveThemeId}
        preview={ctx.preview || !isRegisteredTheme(ctx.site.themeId)}
        themes={themes.map((t) => ({ id: t.id, name: t.name }))}
        sites={sites.map((s) => ({
          id: s.id,
          name: s.name,
          themeName: getTheme(s.themeId).name,
          color: s.settings.colors.primary,
        }))}
      />
    );
  } catch (error) {
    if (isDataUnavailableError(error)) {
      logUnavailable(error, 'dev preview bar');
      return null;
    }
    throw error;
  }
}
