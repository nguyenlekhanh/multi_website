import type { Metadata } from 'next';
import type { Page, Post, SeoSettings, SiteContext } from './types';

/**
 * SEO layer.
 *
 * Builds per-site, per-page metadata (titles, descriptions, canonical URLs,
 * OpenGraph/Twitter) from site configuration. Used by `generateMetadata` in
 * the app router; themes never touch metadata directly.
 */

export function buildMetadata(options: {
  ctx: SiteContext;
  title?: string;
  description?: string;
  /** Route path beginning with "/", used for the canonical URL. */
  path?: string;
  ogImage?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  keywords?: string[];
}): Metadata {
  const { ctx, title, description, path = '/', ogImage, type = 'website', publishedTime, keywords } = options;
  const { settings, origin } = ctx;
  const seo: SeoSettings = settings.seo;

  const pageTitle = title ? seo.titleTemplate.replace('%s', title) : seo.defaultTitle;
  const pageDescription = description || seo.description;
  const canonical = new URL(path, `${origin}/`).toString();

  const image = ogImage || seo.socialImage;
  const imageUrl = image ? new URL(image, `${origin}/`).toString() : undefined;

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: keywords || seo.keywords,
    alternates: { canonical },
    openGraph: {
      type,
      siteName: settings.identity.name,
      title: pageTitle,
      description: pageDescription,
      url: canonical,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      ...(type === 'article' && publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: pageTitle,
      description: pageDescription,
      images: imageUrl ? [imageUrl] : undefined,
      site: seo.twitterHandle,
    },
  };
}

export function metadataForPage(ctx: SiteContext, page: Page): Metadata {
  return buildMetadata({
    ctx,
    title: page.seoTitle || page.title,
    description: page.seoDescription,
    path: page.isHomepage ? '/' : `/${page.slug}`,
    ogImage: page.ogImage,
  });
}

export function metadataForPost(ctx: SiteContext, post: Post): Metadata {
  return buildMetadata({
    ctx,
    title: post.title,
    description: post.excerpt,
    path: `/posts/${post.slug}`,
    ogImage: post.coverImage,
    type: 'article',
    publishedTime: post.publishedAt,
  });
}
