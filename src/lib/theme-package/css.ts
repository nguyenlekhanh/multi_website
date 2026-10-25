/**
 * CSS sanitizer + scoper for theme packages.
 *
 * Package CSS is declarative styling only. The sanitizer rejects constructs
 * that could exfiltrate data or escape the theme scope, then prefixes every
 * rule with `.msp-theme-<id>` so it can only affect the themed subtree.
 */

export type CssResult = { ok: true; css: string } | { ok: false; reason: string };

const FORBIDDEN: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /@import/i, reason: '@import is not allowed.' },
  { pattern: /@charset/i, reason: '@charset is not allowed.' },
  { pattern: /@namespace/i, reason: '@namespace is not allowed.' },
  { pattern: /url\s*\(/i, reason: 'url() is not allowed (no external fetches from theme CSS).' },
  { pattern: /expression\s*\(/i, reason: 'expression() is not allowed.' },
  { pattern: /behavior\s*:/i, reason: 'IE behavior is not allowed.' },
  { pattern: /-moz-binding/i, reason: '-moz-binding is not allowed.' },
  { pattern: /javascript\s*:/i, reason: 'javascript: URIs are not allowed.' },
  { pattern: /<\s*\/?\s*(style|script)/i, reason: 'HTML tags are not allowed inside CSS.' },
  { pattern: /position\s*:\s*fixed/i, reason: 'position: fixed is not allowed (layout stability).' },
];

export function sanitizeAndScopeThemeCss(source: string, themeId: string): CssResult {
  if (!/^[a-z][a-z0-9-]*$/.test(themeId)) {
    return { ok: false, reason: 'Invalid theme id for CSS scoping.' };
  }

  // Strip comments first so they cannot hide forbidden constructs.
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(withoutComments)) {
      return { ok: false, reason: `CSS rejected: ${rule.reason}` };
    }
  }

  const scope = `.msp-theme-${themeId}`;
  const atRuleDepth: string[] = [];
  let out = '';
  let i = 0;
  const length = withoutComments.length;

  const isSelectorChar = (ch: string) => !/[\s{}]/.test(ch);

  while (i < length) {
    const ch = withoutComments[i];

    // At-rule opening (supports one level of nesting: @media / @supports).
    if (ch === '@') {
      const braceOrSemi = withoutComments.slice(i).search(/[{;]/);
      if (braceOrSemi === -1) break;
      const head = withoutComments.slice(i, i + braceOrSemi).trim();
      if (head.toLowerCase().startsWith('@media') || head.toLowerCase().startsWith('@supports')) {
        const brace = withoutComments.indexOf('{', i);
        atRuleDepth.push(head);
        out += `${head} {\n`;
        i = brace + 1;
        continue;
      }
      // Unknown at-rules with a block: keep structure, skip contents safely.
      const semi = withoutComments.indexOf(';', i);
      const brace = withoutComments.indexOf('{', i);
      if (brace !== -1 && (semi === -1 || brace < semi)) {
        // Skip the whole unknown block.
        let depth = 1;
        let j = brace + 1;
        while (j < length && depth > 0) {
          if (withoutComments[j] === '{') depth += 1;
          if (withoutComments[j] === '}') depth -= 1;
          j += 1;
        }
        i = j;
        continue;
      }
      i = (semi === -1 ? length : semi + 1);
      continue;
    }

    if (ch === '}') {
      out += '}\n';
      atRuleDepth.pop();
      i += 1;
      continue;
    }

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    // Selector up to '{'.
    const brace = withoutComments.indexOf('{', i);
    if (brace === -1) break;
    const selector = withoutComments.slice(i, brace).trim();
    if (selector === '') {
      i = brace + 1;
      continue;
    }
    // Scope each comma-separated selector; keep pseudo-classes attached.
    const scoped = selector
      .split(',')
      .map((part) => {
        const s = part.trim();
        if (s === '') return '';
        // `:root`/element selectors become scoped; `&`-free, plain prefixing.
        if (s.startsWith('@')) return s; // defensive; nested at-rule heads
        if (s === '*' || s === ':root') return scope;
        return `${scope} ${s}`;
      })
      .filter(Boolean)
      .join(', ');
    // Copy the declaration block verbatim (already sanitized above).
    let depth = 1;
    let j = brace + 1;
    while (j < length && depth > 0) {
      if (withoutComments[j] === '{') depth += 1;
      if (withoutComments[j] === '}') depth -= 1;
      j += 1;
    }
    const block = withoutComments.slice(brace, j).replace(/\}$/, '}');
    out += `${scoped} ${block}\n`;
    i = j;
    void isSelectorChar;
  }

  const css = out.trim();
  if (css.length > 96 * 1024) {
    return { ok: false, reason: 'CSS too large after scoping.' };
  }
  return { ok: true, css: `${scope}{all:revert-layer;}${'\n'}${css}`.replace('{all:revert-layer;}', ' {}\n') };
}
