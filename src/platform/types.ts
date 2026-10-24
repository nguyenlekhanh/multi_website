/**
 * Core platform types.
 *
 * These types describe everything the platform knows about a website and its
 * content. Themes receive already-resolved data as props and never query the
 * data layer themselves, which keeps rendering and persistence independent.
 */

/* ---------------------------------- Sites --------------------------------- */

export interface NavItem {
  label: string;
  href: string;
}

export interface BrandColors {
  /** Primary brand color: buttons, links, key accents. */
  primary: string;
  /** Text/icon color used on top of `primary`. */
  primaryForeground: string;
  /** Secondary accent (highlights, eyebrows, hover states). */
  accent: string;
  /** Page background. */
  background: string;
  /** Default body text color. */
  foreground: string;
  /** Muted background (cards, bands, subtle sections). */
  muted: string;
  /** Muted text (captions, meta). */
  mutedForeground: string;
  /** Border color. */
  border: string;
  /** Dark band / footer surface. */
  dark: string;
  /** Text used on top of `dark`. */
  darkForeground: string;
}

export interface SiteIdentity {
  name: string;
  tagline: string;
  /** Short wordmark used in headers/footers. */
  logoText: string;
  /** 1-2 letter monogram fallback for logos. */
  logoInitials: string;
  /** Optional image reference (site-relative path or https URL). */
  logoUrl?: string;
  /** Optional favicon reference (site-relative path or https URL). */
  faviconUrl?: string;
}

export interface SeoSettings {
  defaultTitle: string;
  /** `%s` is replaced with the page title, e.g. `%s · Meridian Consulting`. */
  titleTemplate: string;
  description: string;
  keywords?: string[];
  /** Absolute or site-relative path to the default social sharing image. */
  socialImage?: string;
  twitterHandle?: string;
}

export interface SiteSettings {
  identity: SiteIdentity;
  colors: BrandColors;
  nav: NavItem[];
  footerNav: NavItem[];
  seo: SeoSettings;
  /** Optional short blurb shown on the platform landing page. */
  landingBlurb?: string;
}

export interface Site {
  id: string;
  name: string;
  /** Primary production hostname, e.g. `business.demo.local`. */
  domain: string;
  /** Every hostname that resolves to this site (primary first). */
  domains: string[];
  /** Identifier of the active theme (validated against the registry). */
  themeId: string;
  settings: SiteSettings;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------- Content -------------------------------- */

export interface Cta {
  label: string;
  href: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  /** Icon key rendered by the shared icon set. */
  icon?: IconName;
}

export interface CardItem {
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  href?: string;
  /** Small caption lines under the title (price, duration, count...). */
  meta?: string[];
  /** Optional pill/badge label. */
  tag?: string;
  /** Preferred visual size for image cards. */
  size?: 'sm' | 'md' | 'lg';
}

export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  initials?: string;
}

export type IconName =
  | 'shield'
  | 'chart'
  | 'globe'
  | 'users'
  | 'zap'
  | 'compass'
  | 'camera'
  | 'book'
  | 'route'
  | 'spark'
  | 'mail'
  | 'phone'
  | 'pin'
  | 'check';

export type Block =
  | {
      type: 'hero';
      eyebrow?: string;
      title: string;
      subtitle?: string;
      image?: string;
      imageAlt?: string;
      primaryCta?: Cta;
      secondaryCta?: Cta;
    }
  | {
      type: 'logos';
      heading?: string;
      items: string[];
    }
  | {
      type: 'intro';
      eyebrow?: string;
      heading: string;
      body: string[];
      image?: string;
      imageAlt?: string;
      bullets?: string[];
      /** Flip the media/text order. */
      reversed?: boolean;
    }
  | {
      type: 'features';
      eyebrow?: string;
      heading: string;
      intro?: string;
      items: FeatureItem[];
    }
  | {
      type: 'cards';
      eyebrow?: string;
      heading: string;
      intro?: string;
      items: CardItem[];
      columns?: 2 | 3 | 4;
    }
  | {
      type: 'stats';
      items: { value: string; label: string }[];
    }
  | {
      type: 'testimonials';
      eyebrow?: string;
      heading: string;
      items: Testimonial[];
    }
  | {
      type: 'cta';
      heading: string;
      body?: string;
      buttonLabel: string;
      buttonHref: string;
      image?: string;
    }
  | {
      type: 'richtext';
      eyebrow?: string;
      heading?: string;
      paragraphs: string[];
    }
  | {
      type: 'contact';
      heading?: string;
      body?: string[];
      email?: string;
      phone?: string;
      address?: string;
      hours?: string;
    }
  | {
      /** Dynamic block: the platform resolves posts for the current site. */
      type: 'postlist';
      eyebrow?: string;
      heading: string;
      intro?: string;
      limit?: number;
      categorySlug?: string;
      layout?: 'grid' | 'list';
    };

export interface Page {
  siteId: string;
  slug: string;
  title: string;
  /** Overrides the SEO title when set. */
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  isHomepage?: boolean;
  /** Shown as small label above the title on inner pages. */
  eyebrow?: string;
  blocks: Block[];
  updatedAt: string;
}

export interface Author {
  id: string;
  name: string;
  role?: string;
  bio?: string;
  initials: string;
  avatar?: string;
}

export interface Category {
  siteId: string;
  id: string;
  slug: string;
  name: string;
  description?: string;
}

export interface Post {
  siteId: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Plain paragraphs; the first one can be styled with a drop cap by themes. */
  body: string[];
  coverImage?: string;
  coverAlt?: string;
  categoryId?: string;
  tags?: string[];
  /** Optional SEO overrides used by the platform metadata layer. */
  seoTitle?: string;
  seoDescription?: string;
  author: Author;
  publishedAt: string;
  readingMinutes: number;
  featured?: boolean;
}

export interface CategoryWithCount extends Category {
  postCount: number;
}

/* --------------------------- Runtime render context ----------------------- */

export interface SiteContext {
  site: Site;
  settings: SiteSettings;
  /** Theme actually used after registry validation + runtime override. */
  effectiveThemeId: string;
  /** Absolute origin used for canonical URLs. */
  origin: string;
  /** True when rendered through a preview route instead of a mapped domain. */
  preview: boolean;
}

/* ---------------------------------- Themes -------------------------------- */

import type { ComponentType, ReactNode } from 'react';

export interface ThemeLayoutProps {
  ctx: SiteContext;
  children: ReactNode;
}

/** Props for home and generic page views: resolved content + site context. */
export interface ThemeContentView {
  ctx: SiteContext;
  page: Page;
  /** All posts for the site (newest first) — used by `postlist` blocks. */
  posts?: Post[];
  categories?: CategoryWithCount[];
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  supportsPosts: boolean;
  layout: ComponentType<ThemeLayoutProps>;
  home: ComponentType<ThemeContentView>;
  page: ComponentType<ThemeContentView>;
  postList?: ComponentType<{
    ctx: SiteContext;
    posts: Post[];
    categories: CategoryWithCount[];
    activeCategory?: string;
    heading?: string;
  }>;
  post?: ComponentType<{
    ctx: SiteContext;
    post: Post;
    related: Post[];
    categories?: CategoryWithCount[];
  }>;
  categories?: ComponentType<{ ctx: SiteContext; categories: CategoryWithCount[] }>;
  notFound: ComponentType<{ ctx: SiteContext }>;
}
