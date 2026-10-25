/**
 * MSP Theme Package v1 — specification constants and types.
 *
 * A theme package is a ZIP of DECLARATIVE data only: a manifest, JSON
 * templates, one optional CSS file, and static image assets. The runtime
 * renderer (renderer.tsx) maps packages onto platform-approved React
 * components — packages never contain or execute code.
 */

export const THEME_FORMAT = 'msp-theme';
export const THEME_FORMAT_VERSION = 1;

/** The typed content blocks a package may use (mirrors the platform union). */
export const PLATFORM_BLOCKS = [
  'hero',
  'intro',
  'features',
  'cards',
  'stats',
  'testimonials',
  'richtext',
  'logos',
  'cta',
  'contact',
  'postlist',
] as const;
export type PlatformBlockType = (typeof PLATFORM_BLOCKS)[number];

/** Route templates every package must provide. */
export const REQUIRED_TEMPLATES = ['home', 'page', 'postList', 'post'] as const;
export type RequiredTemplate = (typeof REQUIRED_TEMPLATES)[number];

/** Hard limits enforced at validation and install time. */
export const PACKAGE_LIMITS = {
  maxFiles: 64,
  maxCompressedBytes: 2 * 1024 * 1024, // 2 MB ZIP
  maxUncompressedBytes: 8 * 1024 * 1024, // 8 MB total extracted
  maxPreviewBytes: 400 * 1024,
  maxCssBytes: 64 * 1024,
  maxTemplateBytes: 256 * 1024,
  maxAssetBytes: 512 * 1024,
  maxFileNameLength: 160,
} as const;

/** Only these file kinds may appear in a package (by extension + location). */
export const ALLOWED_PREVIEW_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export const THEME_ID_PATTERN = /^[a-z][a-z0-9-]{1,48}$/;
export const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$/;

export const PACKAGE_PREFIX = 'package:';

/** Native registry ids a package id may never shadow. */
export const NATIVE_THEME_IDS = [
  'business',
  'travel',
  'blog',
  'portfolio',
  'news',
  'it',
  'agency',
] as const;

/* --------------------------------- manifest -------------------------------- */

export interface ThemeManifest {
  format: typeof THEME_FORMAT;
  formatVersion: number;
  id: string;
  name: string;
  version: string;
  description: string;
  author: { name: string; url?: string };
  preview?: string;
  compatibility: {
    /** Minimum platform generation this package targets ("1" today). */
    platform: string;
  };
  features: string[];
  supportedBlocks: PlatformBlockType[];
  entry: {
    templates: Record<RequiredTemplate, string>;
    styles?: string;
  };
  layout: PackageLayout;
}

/** Layout chrome + typography the renderer understands. */
export interface PackageLayout {
  header: {
    variant: 'logo-left-nav' | 'centered' | 'nav-cta';
    sticky: boolean;
    /** Show a CTA button from site nav's first link (optional). */
    ctaLabel?: string;
    ctaHref?: string;
  };
  footer: {
    variant: 'columns' | 'minimal' | 'large-brand';
    showTagline: boolean;
  };
  typography: {
    headingFont: 'sans' | 'serif' | 'mono';
    bodyFont: 'sans' | 'serif' | 'mono';
    /** Display scale multiplier for hero titles (0.8–1.4). */
    displayScale?: number;
  };
  colors: {
    /** 'brand' uses the website's configured palette (recommended). */
    mode: 'brand';
  };
}

/* -------------------------------- templates -------------------------------- */

/**
 * A template composes a route: static sections (validated with the same
 * platform block validator used by the CMS) around exactly one `content`
 * slot that renders the website's own CMS blocks.
 */
export interface PackageTemplate {
  route: RequiredTemplate;
  /** Optional page header band above the content slot. */
  contentHeader?: { style: 'none' | 'band' | 'split'; showEyebrow: boolean };
  sections: TemplateSection[];
  /** Route-specific options. */
  options: {
    postListLayout?: 'grid' | 'list';
    postListFeaturedFirst?: boolean;
    postShowCover?: boolean;
    postShowAuthorCard?: boolean;
    containerWidth?: 'narrow' | 'normal' | 'wide';
  };
}

export type TemplateSection =
  | { type: 'content' }
  | ({ type: 'static' } & { block: unknown; variant?: string });

/** Block presentation variants the renderer ships with. */
export const BLOCK_VARIANTS: Record<PlatformBlockType, readonly string[]> = {
  hero: ['split', 'overlay', 'centered'],
  intro: ['media-text', 'stacked'],
  features: ['cards', 'numbered', 'side-icon'],
  cards: ['stacked', 'overlay', 'minimal'],
  stats: ['band', 'columns'],
  testimonials: ['grid', 'carousel-quiet'],
  richtext: ['prose', 'lead'],
  logos: ['row', 'wrapped'],
  cta: ['panel', 'banner', 'split'],
  contact: ['cards', 'rows'],
  postlist: ['cards', 'rows', 'featured-first'],
};

/* ------------------------------ validated package --------------------------- */

export interface ValidatedThemePackage {
  manifest: ThemeManifest;
  /** Parsed templates keyed by route. */
  templates: Record<RequiredTemplate, PackageTemplate>;
  /** Sanitized + scoped CSS ready to inject (empty string when absent). */
  css: string;
  /** preview.png bytes (optional). */
  preview?: { data: Uint8Array; mime: string };
  /** Non-secret package stats for the admin UI. */
  stats: { fileCount: number; totalBytes: number };
}

export interface ValidationError {
  path: string;
  field?: string;
  message: string;
}
