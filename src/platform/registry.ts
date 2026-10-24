import type { ThemeDefinition } from './types';
import { agencyTheme } from '@/themes/agency';
import { blogTheme } from '@/themes/blog';
import { businessTheme } from '@/themes/business';
import { itTheme } from '@/themes/it';
import { newsTheme } from '@/themes/news';
import { portfolioTheme } from '@/themes/portfolio';
import { travelTheme } from '@/themes/travel';

/**
 * Theme registry.
 *
 * Themes register themselves here and are looked up by identifier. Themes
 * contain presentation only — no site resolution and no data access; the
 * platform hands them a SiteContext and already-resolved content.
 *
 * Adding a theme: implement a ThemeDefinition (see src/themes/business) and
 * register it below. Any site can then activate it via its configuration.
 */

const FALLBACK_THEME_ID = 'business';

const themes = new Map<string, ThemeDefinition>();

function registerTheme(theme: ThemeDefinition): void {
  if (themes.has(theme.id)) {
    throw new Error(`Theme "${theme.id}" is already registered.`);
  }
  themes.set(theme.id, theme);
}

registerTheme(businessTheme);
registerTheme(travelTheme);
registerTheme(blogTheme);
registerTheme(portfolioTheme);
registerTheme(newsTheme);
registerTheme(itTheme);
registerTheme(agencyTheme);

export function getTheme(themeId: string | null | undefined): ThemeDefinition {
  const theme = themeId ? themes.get(themeId) : undefined;
  if (theme) return theme;
  if (themeId) {
    console.warn(`[platform] Unknown theme id "${themeId}", falling back to "${FALLBACK_THEME_ID}".`);
  }
  return themes.get(FALLBACK_THEME_ID) as ThemeDefinition;
}

export function isRegisteredTheme(themeId: string | null | undefined): boolean {
  return Boolean(themeId && themes.has(themeId));
}

export function listThemes(): ThemeDefinition[] {
  return [...themes.values()];
}
