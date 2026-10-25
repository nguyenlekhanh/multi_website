import {
  ALLOWED_PREVIEW_MIME,
  BLOCK_VARIANTS,
  PACKAGE_LIMITS,
  PLATFORM_BLOCKS,
  REQUIRED_TEMPLATES,
  SEMVER_PATTERN,
  THEME_FORMAT,
  THEME_FORMAT_VERSION,
  THEME_ID_PATTERN,
  type PackageTemplate,
  type PlatformBlockType,
  type RequiredTemplate,
  type ThemeManifest,
  type ValidatedThemePackage,
  type ValidationError,
} from './spec';
import { validateBlock, ValidationError as BlockValidationError } from '@/platform/data/validation';
import { sanitizeAndScopeThemeCss } from './css';

/**
 * Package validator — pure function over an in-memory file map, used by the
 * CLI, the test suite, and the install service. Rejects anything outside the
 * v1 specification with field-level errors; never executes package content.
 */

export type PackageFiles = Map<string, Uint8Array>;

export type ValidationResult =
  | { ok: true; pkg: ValidatedThemePackage }
  | { ok: false; errors: ValidationError[] };

function normalizePath(raw: string): string | null {
  if (raw.length > PACKAGE_LIMITS.maxFileNameLength) return null;
  if (raw.includes('\\') || raw.includes('\0')) return null;
  if (raw.startsWith('/') || /^[a-zA-Z]:/.test(raw)) return null;
  const parts = raw.split('/').filter((p) => p !== '');
  if (parts.some((p) => p === '.' || p === '..')) return null;
  return parts.join('/');
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot + 1).toLowerCase();
}

function decode(data: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(data);
}

export function validatePackage(files: PackageFiles): ValidationResult {
  const errors: ValidationError[] = [];

  /* ---- file table: allowlist, limits, traversal ---- */
  if (files.size === 0) {
    return { ok: false, errors: [{ path: '(package)', message: 'The package is empty.' }] };
  }
  if (files.size > PACKAGE_LIMITS.maxFiles) {
    errors.push({
      path: '(package)',
      message: `Too many files (${files.size}); the limit is ${PACKAGE_LIMITS.maxFiles}.`,
    });
  }

  let totalBytes = 0;
  const normalized = new Map<string, Uint8Array>();
  for (const [rawName, data] of files) {
    const name = normalizePath(rawName);
    if (!name) {
      errors.push({ path: rawName, message: 'Invalid file path (traversal, absolute, or malformed).' });
      continue;
    }
    if (name.endsWith('/')) {
      errors.push({ path: name, message: 'Directory entries are not expected in v1 packages.' });
      continue;
    }
    if (normalized.has(name)) {
      errors.push({ path: name, message: 'Duplicate file name after normalization.' });
      continue;
    }
    totalBytes += data.byteLength;
    if (totalBytes > PACKAGE_LIMITS.maxUncompressedBytes) {
      errors.push({
        path: '(package)',
        message: `Uncompressed size exceeds ${PACKAGE_LIMITS.maxUncompressedBytes} bytes (ZIP bomb guard).`,
      });
    }
    normalized.set(name, data);
  }

  const allowed = (name: string): boolean => {
    const ext = extensionOf(name);
    if (name === 'theme.json' || name === 'README.md') return true;
    if (name.startsWith('templates/')) return ext === 'json';
    if (name.startsWith('styles/')) return ext === 'css';
    if (name.startsWith('assets/')) return ext in ALLOWED_PREVIEW_MIME;
    // preview may sit at root or under assets/
    return false;
  };

  for (const name of normalized.keys()) {
    if (!allowed(name)) {
      errors.push({
        path: name,
        message:
          'File is not part of the package format. Allowed: theme.json, README.md, templates/*.json, styles/*.css, assets/*.png|jpg|jpeg|webp.',
      });
    }
  }
  if (errors.length > 0 && errors.some((e) => e.path !== 'theme.json')) {
    // Structural failures stop here — the manifest may not even parse.
    if (!normalized.has('theme.json')) {
      errors.push({ path: 'theme.json', message: 'Manifest is missing.' });
      return { ok: false, errors };
    }
  }

  /* ---- manifest ---- */
  const manifestBytes = normalized.get('theme.json');
  if (!manifestBytes) {
    return { ok: false, errors: [...errors, { path: 'theme.json', message: 'Manifest is missing.' }] };
  }
  if (manifestBytes.byteLength > PACKAGE_LIMITS.maxTemplateBytes) {
    errors.push({ path: 'theme.json', message: 'Manifest exceeds the size limit.' });
  }

  let manifestRaw: unknown;
  try {
    manifestRaw = JSON.parse(decode(manifestBytes));
  } catch (error) {
    return {
      ok: false,
      errors: [
        ...errors,
        { path: 'theme.json', message: `Manifest is not valid JSON: ${(error as Error).message}` },
      ],
    };
  }
  const m = manifestRaw as Record<string, unknown>;
  const mErr = (field: string, message: string) => errors.push({ path: 'theme.json', field, message });

  if (m.format !== THEME_FORMAT) mErr('format', `Must be "${THEME_FORMAT}".`);
  if (m.formatVersion !== THEME_FORMAT_VERSION) {
    mErr('formatVersion', `Unsupported format version ${String(m.formatVersion)}; this runtime supports ${THEME_FORMAT_VERSION}.`);
  }
  if (typeof m.id !== 'string' || !THEME_ID_PATTERN.test(m.id)) {
    mErr('id', 'Theme id must match ^[a-z][a-z0-9-]{1,48}$ (lowercase kebab-case).');
  }
  if (typeof m.name !== 'string' || m.name.trim().length < 2 || m.name.length > 80) {
    mErr('name', 'Name must be 2–80 characters.');
  }
  if (typeof m.version !== 'string' || !SEMVER_PATTERN.test(m.version)) {
    mErr('version', 'Version must be semver (MAJOR.MINOR.PATCH, optional prerelease).');
  }
  if (typeof m.description !== 'string' || m.description.length < 10 || m.description.length > 400) {
    mErr('description', 'Description must be 10–400 characters.');
  }
  const author = m.author as Record<string, unknown> | undefined;
  if (!author || typeof author?.name !== 'string' || author.name.length < 2) {
    mErr('author.name', 'Author name is required.');
  } else if (author.url !== undefined && !/^https:\/\//.test(String(author.url))) {
    mErr('author.url', 'Author url must be an https:// URL.');
  }
  const compat = m.compatibility as Record<string, unknown> | undefined;
  if (!compat || compat.platform !== '1') {
    mErr('compatibility.platform', 'Must be "1" (platform generation 1).');
  }
  if (!Array.isArray(m.features)) mErr('features', 'Features must be an array of strings.');
  else if (m.features.some((f) => typeof f !== 'string' || f.length > 40)) {
    mErr('features', 'Each feature must be a string of at most 40 characters.');
  }

  const supported = m.supportedBlocks;
  if (!Array.isArray(supported) || supported.length === 0) {
    mErr('supportedBlocks', 'Must list at least one supported block type.');
  } else {
    for (const b of supported) {
      if (!(PLATFORM_BLOCKS as readonly string[]).includes(b)) {
        mErr('supportedBlocks', `Unknown block type "${String(b)}" — this runtime supports: ${PLATFORM_BLOCKS.join(', ')}.`);
      }
    }
  }

  const entry = m.entry as Record<string, unknown> | undefined;
  const entryTemplates = entry?.templates as Record<string, unknown> | undefined;
  if (!entry || typeof entry !== 'object' || !entryTemplates) {
    mErr('entry.templates', 'Entry must declare templates for home, page, postList, post.');
  } else {
    for (const route of REQUIRED_TEMPLATES) {
      const p = entryTemplates[route];
      if (typeof p !== 'string' || p.trim() === '') {
        mErr(`entry.templates.${route}`, `Required template "${route}" is missing.`);
      }
    }
    for (const key of Object.keys(entryTemplates)) {
      if (!(REQUIRED_TEMPLATES as readonly string[]).includes(key)) {
        mErr(`entry.templates.${key}`, `Unknown template slot "${key}" (supported: ${REQUIRED_TEMPLATES.join(', ')}).`);
      }
    }
  }
  if (entry?.styles !== undefined && typeof entry.styles !== 'string') {
    mErr('entry.styles', 'Styles must be a path string.');
  }
  if (m.preview !== undefined && typeof m.preview !== 'string') {
    mErr('preview', 'Preview must be a path string.');
  }

  // Hard-stop before template parsing if the manifest itself is unusable.
  if (errors.some((e) => e.path === 'theme.json')) {
    return { ok: false, errors };
  }

  const manifest: ThemeManifest = m as unknown as ThemeManifest;

  /* ---- referenced files exist + are inside the package ---- */
  const resolveEntry = (raw: string, field: string): string | null => {
    const p = normalizePath(raw);
    if (!p) {
      errors.push({ path: 'theme.json', field, message: `Entry path "${raw}" is invalid (traversal or absolute).` });
      return null;
    }
    if (!normalized.has(p)) {
      errors.push({ path: 'theme.json', field, message: `Entry file "${p}" does not exist in the package.` });
      return null;
    }
    return p;
  };

  const templatePaths: Partial<Record<RequiredTemplate, string>> = {};
  for (const route of REQUIRED_TEMPLATES) {
    const p = resolveEntry(manifest.entry.templates[route], `entry.templates.${route}`);
    if (p) templatePaths[route] = p;
  }
  let cssPath: string | null = null;
  if (manifest.entry.styles) {
    cssPath = resolveEntry(manifest.entry.styles, 'entry.styles');
    if (cssPath) {
      const cssBytes = normalized.get(cssPath)!;
      if (cssBytes.byteLength > PACKAGE_LIMITS.maxCssBytes) {
        errors.push({ path: cssPath, message: `CSS exceeds ${PACKAGE_LIMITS.maxCssBytes} bytes.` });
        cssPath = null;
      }
    }
  }
  let previewFile: { data: Uint8Array; mime: string } | undefined;
  if (manifest.preview) {
    const p = resolveEntry(manifest.preview, 'preview');
    if (p) {
      const ext = extensionOf(p);
      const mime = ALLOWED_PREVIEW_MIME[ext];
      const data = normalized.get(p)!;
      if (!mime) {
        errors.push({ path: p, message: 'Preview must be png, jpg, jpeg, or webp.' });
      } else if (data.byteLength > PACKAGE_LIMITS.maxPreviewBytes) {
        errors.push({ path: p, message: `Preview exceeds ${PACKAGE_LIMITS.maxPreviewBytes} bytes.` });
      } else {
        previewFile = { data, mime };
      }
    }
  }

  /* ---- assets referenced by templates must exist ---- */
  const assetRefs = new Set<string>();
  const collectAssetRefs = (block: Record<string, unknown>) => {
    const check = (value: unknown) => {
      if (typeof value === 'string' && value.startsWith('assets/')) assetRefs.add(value);
    };
    check(block.image);
    if (Array.isArray(block.items)) {
      for (const item of block.items as Record<string, unknown>[]) check(item?.image);
    }
  };

  /* ---- templates ---- */
  const templates: Partial<Record<RequiredTemplate, PackageTemplate>> = {};
  for (const route of REQUIRED_TEMPLATES) {
    const p = templatePaths[route];
    if (!p) continue;
    const bytes = normalized.get(p)!;
    if (bytes.byteLength > PACKAGE_LIMITS.maxTemplateBytes) {
      errors.push({ path: p, message: `Template exceeds ${PACKAGE_LIMITS.maxTemplateBytes} bytes.` });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(decode(bytes));
    } catch (error) {
      errors.push({ path: p, message: `Template is not valid JSON: ${(error as Error).message}` });
      continue;
    }
    const t = parsed as Record<string, unknown>;
    if (t.route !== route) {
      errors.push({ path: p, field: 'route', message: `Template "route" must be "${route}".` });
    }
    if (!Array.isArray(t.sections)) {
      errors.push({ path: p, field: 'sections', message: 'Sections must be an array.' });
      continue;
    }
    if (!t.sections.some((s) => (s as Record<string, unknown>)?.type === 'content')) {
      errors.push({ path: p, field: 'sections', message: 'Template must contain exactly one { "type": "content" } slot.' });
    }
    if (t.sections.filter((s) => (s as Record<string, unknown>)?.type === 'content').length > 1) {
      errors.push({ path: p, field: 'sections', message: 'Only one content slot is allowed per template.' });
    }

    const validatedSections: PackageTemplate['sections'] = [];
    t.sections.forEach((rawSection, index) => {
      const section = rawSection as Record<string, unknown>;
      if (section?.type === 'content') {
        validatedSections.push({ type: 'content' });
        return;
      }
      if (section?.type !== 'static' || typeof section.block !== 'object' || section.block === null) {
        errors.push({
          path: p,
          field: `sections[${index}]`,
          message: 'Each section is { "type": "content" } or { "type": "static", "block": { … } }.',
        });
        return;
      }
      const block = section.block as Record<string, unknown>;
      const blockType = String(block.type ?? '');
      if (!(PLATFORM_BLOCKS as readonly string[]).includes(blockType)) {
        errors.push({
          path: p,
          field: `sections[${index}].block.type`,
          message: `Unsupported block type "${blockType}".`,
        });
        return;
      }
      if (!(manifest.supportedBlocks as readonly string[]).includes(blockType)) {
        errors.push({
          path: p,
          field: `sections[${index}].block.type`,
          message: `Block "${blockType}" is not declared in manifest.supportedBlocks.`,
        });
        return;
      }
      // Static blocks are validated with the SAME validator the CMS uses.
      try {
        validateBlock(block, `sections[${index}].block`);
      } catch (error) {
        const message = error instanceof BlockValidationError ? error.message : String(error);
        errors.push({ path: p, field: `sections[${index}].block`, message });
        return;
      }
      const variant = section.variant === undefined ? undefined : String(section.variant);
      if (variant !== undefined) {
        const allowedVariants = BLOCK_VARIANTS[blockType as PlatformBlockType];
        if (!allowedVariants.includes(variant)) {
          errors.push({
            path: p,
            field: `sections[${index}].variant`,
            message: `Unknown variant "${variant}" for block "${blockType}" (allowed: ${allowedVariants.join(', ')}).`,
          });
          return;
        }
      }
      collectAssetRefs(block);
      validatedSections.push({ type: 'static', block, ...(variant ? { variant } : {}) });
    });

    const header = (t.contentHeader ?? {}) as Record<string, unknown>;
    const headerStyle = String(header.style ?? 'band');
    if (!['none', 'band', 'split'].includes(headerStyle)) {
      errors.push({ path: p, field: 'contentHeader.style', message: `Unknown contentHeader style "${headerStyle}".` });
    }
    const options = (t.options ?? {}) as Record<string, unknown>;
    const opt = (key: string, allowed: readonly (string | boolean)[]): string | boolean | undefined => {
      const value = options[key];
      if (value === undefined) return undefined;
      if (!allowed.includes(value as never)) {
        errors.push({ path: p, field: `options.${key}`, message: `Unknown value "${String(value)}" (allowed: ${allowed.join(', ')}).` });
        return undefined;
      }
      return value as string | boolean;
    };
    const template: PackageTemplate = {
      route,
      contentHeader: {
        style: headerStyle as 'none' | 'band' | 'split',
        showEyebrow: Boolean(header.showEyebrow),
      },
      sections: validatedSections,
      options: {
        ...(opt('postListLayout', ['grid', 'list']) !== undefined
          ? { postListLayout: opt('postListLayout', ['grid', 'list']) as 'grid' | 'list' }
          : {}),
        ...(opt('postListFeaturedFirst', [true, false]) !== undefined
          ? { postListFeaturedFirst: opt('postListFeaturedFirst', [true, false]) as boolean }
          : {}),
        ...(opt('postShowCover', [true, false]) !== undefined
          ? { postShowCover: opt('postShowCover', [true, false]) as boolean }
          : {}),
        ...(opt('postShowAuthorCard', [true, false]) !== undefined
          ? { postShowAuthorCard: opt('postShowAuthorCard', [true, false]) as boolean }
          : {}),
        ...(opt('containerWidth', ['narrow', 'normal', 'wide']) !== undefined
          ? { containerWidth: opt('containerWidth', ['narrow', 'normal', 'wide']) as 'narrow' | 'normal' | 'wide' }
          : {}),
      },
    };
    templates[route] = template;
  }

  for (const ref of assetRefs) {
    const p = normalizePath(ref);
    if (!p || !normalized.has(p)) {
      errors.push({ path: ref, message: 'Referenced asset does not exist in the package.' });
    } else if (!p.startsWith('assets/') || !(extensionOf(p) in ALLOWED_PREVIEW_MIME)) {
      errors.push({ path: ref, message: 'Template images must reference assets/*.png|jpg|jpeg|webp inside the package.' });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  /* ---- CSS sanitize + scope ---- */
  let css = '';
  if (cssPath) {
    const result = sanitizeAndScopeThemeCss(decode(normalized.get(cssPath)!), manifest.id);
    if (!result.ok) {
      return { ok: false, errors: [...errors, { path: cssPath, message: result.reason }] };
    }
    css = result.css;
  }

  return {
    ok: true,
    pkg: {
      manifest,
      templates: templates as Record<RequiredTemplate, PackageTemplate>,
      css,
      preview: previewFile,
      stats: { fileCount: normalized.size, totalBytes },
    },
  };
}

/** Compare semver strings: positive when a > b. */
export function compareSemver(a: string, b: string): number {
  const pa = a.replace(/-.*$/, '').split('.').map(Number);
  const pb = b.replace(/-.*$/, '').split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}
