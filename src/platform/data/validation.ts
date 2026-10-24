import type {
  Block,
  BrandColors,
  NavItem,
  SeoSettings,
  SiteIdentity,
  SiteSettings,
  Testimonial,
} from '../types';

/**
 * Validation for the JSON columns stored in PostgreSQL.
 *
 * Flexible configuration is stored as JSON but never trusted: every read
 * from a JSON column passes through these validators, and the seed/import
 * script uses the same functions to fail fast on bad fixtures. Invalid data
 * throws a `ValidationError` naming the offending field — it never reaches
 * the browser (render boundaries convert it into an availability error).
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, field: string, { optional = false }: { optional?: boolean } = {}): string {
  if (value === undefined || value === null) {
    if (optional) return undefined as unknown as string;
    throw new ValidationError(`${field} is required`);
  }
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  return value;
}

function bool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new ValidationError(`${field} must be a boolean`);
  return value;
}

function num(value: unknown, field: string, { optional = false }: { optional?: boolean } = {}): number {
  if (value === undefined || value === null) {
    if (optional) return undefined as unknown as number;
    throw new ValidationError(`${field} is required`);
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a finite number`);
  }
  return value;
}

function arrayOf<T>(value: unknown, field: string, item: (v: unknown, i: number) => T): T[] {
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be an array`);
  return value.map((v, i) => item(v, i));
}

/** Validates a string against a fixed set of values and narrows the type. */
function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[], { optional = false }: { optional?: boolean } = {}): T {
  if (value === undefined || value === null) {
    if (optional) return undefined as unknown as T;
    throw new ValidationError(`${field} is required`);
  }
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

/* --------------------------------- Shapes --------------------------------- */

export function validateNavItem(value: unknown, field: string): NavItem {
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  const href = str(value.href, `${field}.href`);
  if (!href.startsWith('/') && !href.startsWith('?') && !/^https?:\/\//.test(href)) {
    throw new ValidationError(`${field}.href must be an app path or absolute URL`);
  }
  return { label: str(value.label, `${field}.label`), href };
}

export function validateBrandColors(value: unknown, field: string): BrandColors {
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  const keys = [
    'primary', 'primaryForeground', 'accent', 'background', 'foreground',
    'muted', 'mutedForeground', 'border', 'dark', 'darkForeground',
  ] as const;
  const out = {} as BrandColors;
  for (const key of keys) {
    const v = str(value[key], `${field}.${key}`);
    if (!/^#[0-9a-fA-F]{3,8}$/.test(v) && !/^rgb/.test(v)) {
      throw new ValidationError(`${field}.${key} must be a CSS color`);
    }
    out[key] = v;
  }
  return out;
}

export function validateSiteIdentity(value: unknown, field: string): SiteIdentity {
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  return {
    name: str(value.name, `${field}.name`),
    tagline: str(value.tagline, `${field}.tagline`),
    logoText: str(value.logoText, `${field}.logoText`),
    logoInitials: str(value.logoInitials, `${field}.logoInitials`),
  };
}

export function validateSeoSettings(value: unknown, field: string): SeoSettings {
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  return {
    defaultTitle: str(value.defaultTitle, `${field}.defaultTitle`),
    titleTemplate: str(value.titleTemplate, `${field}.titleTemplate`),
    description: str(value.description, `${field}.description`),
    keywords: value.keywords === undefined ? undefined : arrayOf(value.keywords, `${field}.keywords`, (k, i) => str(k, `${field}.keywords[${i}]`)),
    socialImage: value.socialImage === undefined ? undefined : str(value.socialImage, `${field}.socialImage`, { optional: true }),
    twitterHandle: value.twitterHandle === undefined ? undefined : str(value.twitterHandle, `${field}.twitterHandle`, { optional: true }),
  };
}

export function validateSiteSettings(value: unknown, field: string): SiteSettings {
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  const extras = value.extras === undefined ? undefined : value.extras;
  const settings: SiteSettings = {
    identity: validateSiteIdentity(value.identity, `${field}.identity`),
    colors: validateBrandColors(value.colors, `${field}.colors`),
    nav: arrayOf(value.nav, `${field}.nav`, (v, i) => validateNavItem(v, `${field}.nav[${i}]`)),
    footerNav: arrayOf(value.footerNav, `${field}.footerNav`, (v, i) => validateNavItem(v, `${field}.footerNav[${i}]`)),
    seo: validateSeoSettings(value.seo, `${field}.seo`),
  };
  if (isObject(extras) && typeof extras.landingBlurb === 'string') {
    settings.landingBlurb = extras.landingBlurb;
  }
  return settings;
}

/* --------------------------------- Blocks --------------------------------- */

function validateCta(value: unknown, field: string) {
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  return { label: str(value.label, `${field}.label`), href: str(value.href, `${field}.href`) };
}

const ICON_NAMES = ['shield', 'chart', 'globe', 'users', 'zap', 'compass', 'camera', 'book', 'route', 'spark', 'mail', 'phone', 'pin', 'check'] as const;

function validateFeatureItem(value: unknown, field: string) {
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  return {
    title: str(value.title, `${field}.title`),
    description: str(value.description, `${field}.description`),
    icon: value.icon === undefined ? undefined : oneOf(value.icon, `${field}.icon`, ICON_NAMES, { optional: true }),
  };
}

function validateCardItem(value: unknown, field: string) {
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  return {
    title: str(value.title, `${field}.title`),
    description: value.description === undefined ? undefined : str(value.description, `${field}.description`, { optional: true }),
    image: value.image === undefined ? undefined : str(value.image, `${field}.image`, { optional: true }),
    imageAlt: value.imageAlt === undefined ? undefined : str(value.imageAlt, `${field}.imageAlt`, { optional: true }),
    href: value.href === undefined ? undefined : str(value.href, `${field}.href`, { optional: true }),
    meta: value.meta === undefined ? undefined : arrayOf(value.meta, `${field}.meta`, (m, i) => str(m, `${field}.meta[${i}]`)),
    tag: value.tag === undefined ? undefined : str(value.tag, `${field}.tag`, { optional: true }),
    size: value.size === undefined ? undefined : oneOf(value.size, `${field}.size`, ['sm', 'md', 'lg'] as const, { optional: true }),
  };
}

function validateTestimonial(value: unknown, field: string): Testimonial {
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  return {
    quote: str(value.quote, `${field}.quote`),
    author: str(value.author, `${field}.author`),
    role: value.role === undefined ? undefined : str(value.role, `${field}.role`, { optional: true }),
    initials: value.initials === undefined ? undefined : str(value.initials, `${field}.initials`, { optional: true }),
  };
}

export function validateBlock(value: unknown, field: string): Block {
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  const type = str(value.type, `${field}.type`);
  switch (type) {
    case 'hero':
      return {
        type,
        eyebrow: value.eyebrow === undefined ? undefined : str(value.eyebrow, `${field}.eyebrow`, { optional: true }),
        title: str(value.title, `${field}.title`),
        subtitle: value.subtitle === undefined ? undefined : str(value.subtitle, `${field}.subtitle`, { optional: true }),
        image: value.image === undefined ? undefined : str(value.image, `${field}.image`, { optional: true }),
        imageAlt: value.imageAlt === undefined ? undefined : str(value.imageAlt, `${field}.imageAlt`, { optional: true }),
        primaryCta: value.primaryCta === undefined ? undefined : validateCta(value.primaryCta, `${field}.primaryCta`),
        secondaryCta: value.secondaryCta === undefined ? undefined : validateCta(value.secondaryCta, `${field}.secondaryCta`),
      };
    case 'logos':
      return {
        type,
        heading: value.heading === undefined ? undefined : str(value.heading, `${field}.heading`, { optional: true }),
        items: arrayOf(value.items, `${field}.items`, (v, i) => str(v, `${field}.items[${i}]`)),
      };
    case 'intro':
      return {
        type,
        eyebrow: value.eyebrow === undefined ? undefined : str(value.eyebrow, `${field}.eyebrow`, { optional: true }),
        heading: str(value.heading, `${field}.heading`),
        body: arrayOf(value.body, `${field}.body`, (v, i) => str(v, `${field}.body[${i}]`)),
        image: value.image === undefined ? undefined : str(value.image, `${field}.image`, { optional: true }),
        imageAlt: value.imageAlt === undefined ? undefined : str(value.imageAlt, `${field}.imageAlt`, { optional: true }),
        bullets: value.bullets === undefined ? undefined : arrayOf(value.bullets, `${field}.bullets`, (v, i) => str(v, `${field}.bullets[${i}]`)),
        reversed: value.reversed === undefined ? undefined : bool(value.reversed, `${field}.reversed`),
      };
    case 'features':
      return {
        type,
        eyebrow: value.eyebrow === undefined ? undefined : str(value.eyebrow, `${field}.eyebrow`, { optional: true }),
        heading: str(value.heading, `${field}.heading`),
        intro: value.intro === undefined ? undefined : str(value.intro, `${field}.intro`, { optional: true }),
        items: arrayOf(value.items, `${field}.items`, (v, i) => validateFeatureItem(v, `${field}.items[${i}]`)),
      };
    case 'cards':
      return {
        type,
        eyebrow: value.eyebrow === undefined ? undefined : str(value.eyebrow, `${field}.eyebrow`, { optional: true }),
        heading: str(value.heading, `${field}.heading`),
        intro: value.intro === undefined ? undefined : str(value.intro, `${field}.intro`, { optional: true }),
        items: arrayOf(value.items, `${field}.items`, (v, i) => validateCardItem(v, `${field}.items[${i}]`)),
        columns: value.columns === undefined ? undefined : oneOf(String(value.columns), `${field}.columns`, ['2', '3', '4'] as const, { optional: true }) as unknown as 2 | 3 | 4,
      };
    case 'stats':
      return {
        type,
        items: arrayOf(value.items, `${field}.items`, (v, i) => {
          if (!isObject(v)) throw new ValidationError(`${field}.items[${i}] must be an object`);
          return { value: str(v.value, `${field}.items[${i}].value`), label: str(v.label, `${field}.items[${i}].label`) };
        }),
      };
    case 'testimonials':
      return {
        type,
        eyebrow: value.eyebrow === undefined ? undefined : str(value.eyebrow, `${field}.eyebrow`, { optional: true }),
        heading: str(value.heading, `${field}.heading`),
        items: arrayOf(value.items, `${field}.items`, (v, i) => validateTestimonial(v, `${field}.items[${i}]`)),
      };
    case 'cta':
      return {
        type,
        heading: str(value.heading, `${field}.heading`),
        body: value.body === undefined ? undefined : str(value.body, `${field}.body`, { optional: true }),
        buttonLabel: str(value.buttonLabel, `${field}.buttonLabel`),
        buttonHref: str(value.buttonHref, `${field}.buttonHref`),
        image: value.image === undefined ? undefined : str(value.image, `${field}.image`, { optional: true }),
      };
    case 'richtext':
      return {
        type,
        eyebrow: value.eyebrow === undefined ? undefined : str(value.eyebrow, `${field}.eyebrow`, { optional: true }),
        heading: value.heading === undefined ? undefined : str(value.heading, `${field}.heading`, { optional: true }),
        paragraphs: arrayOf(value.paragraphs, `${field}.paragraphs`, (v, i) => str(v, `${field}.paragraphs[${i}]`)),
      };
    case 'contact':
      return {
        type,
        heading: value.heading === undefined ? undefined : str(value.heading, `${field}.heading`, { optional: true }),
        body: value.body === undefined ? undefined : arrayOf(value.body, `${field}.body`, (v, i) => str(v, `${field}.body[${i}]`)),
        email: value.email === undefined ? undefined : str(value.email, `${field}.email`, { optional: true }),
        phone: value.phone === undefined ? undefined : str(value.phone, `${field}.phone`, { optional: true }),
        address: value.address === undefined ? undefined : str(value.address, `${field}.address`, { optional: true }),
        hours: value.hours === undefined ? undefined : str(value.hours, `${field}.hours`, { optional: true }),
      };
    case 'postlist':
      return {
        type,
        eyebrow: value.eyebrow === undefined ? undefined : str(value.eyebrow, `${field}.eyebrow`, { optional: true }),
        heading: str(value.heading, `${field}.heading`),
        intro: value.intro === undefined ? undefined : str(value.intro, `${field}.intro`, { optional: true }),
        limit: value.limit === undefined ? undefined : num(value.limit, `${field}.limit`, { optional: true }),
        categorySlug: value.categorySlug === undefined ? undefined : str(value.categorySlug, `${field}.categorySlug`, { optional: true }),
        layout: value.layout === undefined ? undefined : oneOf(value.layout, `${field}.layout`, ['grid', 'list'] as const, { optional: true }),
      };
    default:
      throw new ValidationError(`${field}.type "${type}" is not a known block type`);
  }
}

export function validateBlocks(value: unknown, field: string): Block[] {
  return arrayOf(value, field, (v, i) => validateBlock(v, `${field}[${i}]`));
}

export function validateParagraphs(value: unknown, field: string): string[] {
  return arrayOf(value, field, (v, i) => str(v, `${field}[${i}]`));
}

/* ------------------------------ Row validation ---------------------------- */

export function validateSiteRow(site: {
  id: string;
  name: string;
  themeId: string;
  domains: string[];
  settings: unknown;
}): { id: string; name: string; themeId: string; domains: string[]; settings: SiteSettings } {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(site.id)) {
    throw new ValidationError(`site id "${site.id}" must be a lowercase slug`);
  }
  const settings = validateSiteSettings(site.settings, `site "${site.id}" settings`);
  return { id: site.id, name: site.name, themeId: site.themeId, domains: site.domains, settings };
}
