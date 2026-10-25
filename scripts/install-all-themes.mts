/**
 * Batch-installs theme packages from theme-packages/ into the configured
 * DATABASE_URL through the standard installer service (validation + audit
 * included). Skips already-installed current versions.
 *
 *   npx tsx scripts/install-all-themes.ts [id ...]
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}
if (!process.env.DATABASE_URL) {
  console.error('✗ DATABASE_URL is required.');
  process.exit(1);
}

const requested = process.argv.slice(2);
const root = resolve(process.cwd(), 'theme-packages');
const candidates = requested.length > 0
  ? requested
  : readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory() && existsSync(join(root, name, 'theme.json')));

// Provision the attribution-only CLI account (audit FK) once.
const { getPrisma } = await import('../src/platform/data/prisma');
const bcrypt = await import('bcryptjs');
const prisma = getPrisma();
await prisma.adminUser.upsert({
  where: { id: 'cli-installer' },
  create: {
    id: 'cli-installer', email: 'cli@local', name: 'CLI Installer',
    role: 'SUPER_ADMIN', passwordHash: await bcrypt.hash(crypto.randomUUID() + crypto.randomUUID(), 12),
    active: false,
  },
  update: {},
});
await prisma.$disconnect();

const { installThemePackage } = await import('../src/lib/theme-package/store');
const { makeZip } = await import('../src/lib/theme-package/zip');
const actor = { id: 'cli-installer', email: 'cli@local', name: 'CLI Installer', role: 'SUPER_ADMIN' as const };

let installed = 0;
let skipped = 0;
let failed = 0;

for (const id of candidates) {
  const dir = join(root, id);
  const files: Array<{ name: string; data: Uint8Array }> = [];
  const walk = (current: string, prefix: string) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) walk(full, `${prefix}${entry}/`);
      else files.push({ name: `${prefix}${entry}`, data: new Uint8Array(readFileSync(full)) });
    }
  };
  walk(dir, '');
  const zip = makeZip(files);
  const result = await installThemePackage(actor, zip);
  if (result.ok) {
    installed += 1;
    console.log(`✓ ${id} v${result.version}${result.updated ? ' (update)' : ''}`);
  } else if (result.error.includes('already installed')) {
    skipped += 1;
    console.log(`• ${id} already installed — skipped`);
  } else {
    failed += 1;
    console.error(`✗ ${id}: ${result.error}`);
    for (const error of result.errors ?? []) console.error(`  ${error.path}: ${error.message}`);
  }
}

console.log(`\n${installed} installed, ${skipped} skipped, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
