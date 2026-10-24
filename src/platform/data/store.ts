/**
 * Runtime overrides for development tooling (theme switching, preview).
 *
 * The MVP's data source is immutable seed data. Dev-only controls such as the
 * theme switcher mutate this in-memory map instead of the seed, so the change
 * is isolated to the running server process and never touches other sites.
 *
 * The map lives on `globalThis` because dev bundling can evaluate this module
 * more than once (server-action vs render graphs); globalThis keeps one
 * shared instance per server process. With a real database these writes
 * become normal UPDATE statements.
 */

const GLOBAL_KEY = '__multiSiteThemeOverrides';

const overrides: Map<string, string> = (() => {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Map<string, string> };
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map();
  return g[GLOBAL_KEY];
})();

export function getThemeOverride(siteId: string): string | undefined {
  return overrides.get(siteId);
}

export function setThemeOverride(siteId: string, themeId: string): void {
  overrides.set(siteId, themeId);
}
