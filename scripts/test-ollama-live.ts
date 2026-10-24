/**
 * Real Ollama integration check — runs one live generation through the
 * production pipeline against the local Ollama instance.
 *   npx tsx scripts/test-ollama-live.ts
 * Skipped by CI; run manually when Ollama is available.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
for (const envPath of ['.env']) {
  const full = resolve(process.cwd(), envPath);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mspp_admin@127.0.0.1:5544/mspp_test';
process.env.DATA_SOURCE = 'postgres';

import { OllamaProvider } from '../src/lib/ai/providers';
import { parseArticleResponse } from '../src/lib/ai/output-schema';
import { buildSystemPrompt, buildUserPrompt } from '../src/lib/ai/prompts';

const BASE = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
const MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5vl:3b';

async function main() {
  const provider = new OllamaProvider(BASE);
  const conn = await provider.testConnection();
  console.log('connection:', conn.ok ? 'OK' : 'FAILED', '—', conn.note);
  if (!conn.ok || !conn.models?.includes(MODEL)) {
    console.error(`Model "${MODEL}" not available locally. Available: ${conn.models?.join(', ')}`);
    process.exit(1);
  }

  const system = buildSystemPrompt();
  const user = buildUserPrompt({
    config: {
      language: 'English', tone: 'professional', audience: 'IT decision-makers',
      wordCountTarget: 350, format: 'article', customInstructions: null,
    },
    siteName: 'Northbeam Systems',
    siteTagline: 'Cloud engineering that stays boring',
    topicTitle: 'Why small teams should run fewer services',
    keywords: ['platform engineering', 'consolidation'],
    excluded: ['vendor gossip'],
    categoryNames: ['Engineering'],
    recentTitles: [],
  });

  const started = Date.now();
  const raw = await provider.generate({ systemPrompt: system, userPrompt: user, model: MODEL, timeoutMs: 180_000 });
  const elapsed = Math.round((Date.now() - started) / 1000);
  console.log(`generation took ${elapsed}s`);

  const article = parseArticleResponse(raw, 350);
  console.log('── validated article ──');
  console.log('title   :', article.title);
  console.log('slug    :', article.slug);
  console.log('words   :', article.wordCount);
  console.log('tags    :', article.tags.join(', '));
  console.log('excerpt :', article.excerpt.slice(0, 100) + '…');
  console.log('OK — real Ollama generation passed the full output contract.');
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
