import type { CSSProperties } from 'react';
import type { BrandColors } from '@/platform/types';

/**
 * Maps a site's brand configuration onto the CSS variables consumed by the
 * t-* utilities defined in app/globals.css. Every theme calls this on its
 * root element — it is the only coupling between brand data and styles.
 */
export function themeVars(c: BrandColors): CSSProperties {
  return {
    '--c-primary': c.primary,
    '--c-primary-fg': c.primaryForeground,
    '--c-accent': c.accent,
    '--c-bg': c.background,
    '--c-fg': c.foreground,
    '--c-muted': c.muted,
    '--c-muted-fg': c.mutedForeground,
    '--c-border': c.border,
    '--c-dark': c.dark,
    '--c-dark-fg': c.darkForeground,
  } as CSSProperties;
}
