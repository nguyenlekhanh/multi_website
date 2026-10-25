/**
 * Theme package CLI — validate / pack / install.
 *
 *   npm run theme:validate -- <package-dir>
 *   npm run theme:pack     -- <package-dir>   (writes <dir>.zip next to it)
 *   npm run theme:install  -- <package-dir|zip> (installs into DATABASE_URL)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

for (const envPath of ['.env']) {
  const full = resolve(process.cwd(), envPath);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

function loadDirectory(dir: string): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) walk(full);
      else files.set(relative(dir, full).replace(/\\/g, '/'), new Uint8Array(readFileSync(full)));
    }
  };
  walk(dir);
  return files;
}

async function main() {
  const [command, targetArg] = process.argv.slice(2);
  if (!command || !targetArg) {
    console.error('Usage: npm run theme:<validate|pack|install> -- <package-dir | zip-file>');
    process.exit(1);
  }
  const target = resolve(process.cwd(), targetArg);

  const { validatePackage } = await import('../src/lib/theme-package/validate');

  let files: Map<string, Uint8Array>;
  let zipBytes: Uint8Array | null = null;

  if (target.endsWith('.zip')) {
    const { readZip } = await import('../src/lib/theme-package/zip');
    const bytes = new Uint8Array(readFileSync(target));
    const zip = readZip(bytes);
    if (!zip.ok) {
      console.error(`✗ ${zip.error}`);
      process.exit(1);
    }
    files = new Map(zip.entries.map((e) => [e.name, e.data]));
    zipBytes = bytes;
  } else {
    if (!existsSync(target) || !statSync(target).isDirectory()) {
      console.error(`✗ Not a directory: ${target}`);
      process.exit(1);
    }
    files = loadDirectory(target);
  }

  if (command === 'validate' || command === 'pack' || command === 'install') {
    const result = validatePackage(files);
    if (!result.ok) {
      console.error(`✗ Validation failed (${result.errors.length} error${result.errors.length === 1 ? '' : 's'}):`);
      for (const error of result.errors) {
        console.error(`  ${error.path}${error.field ? ` · ${error.field}` : ''}: ${error.message}`);
      }
      process.exit(1);
    }
    const { manifest, stats } = result.pkg;
    console.log(`✓ Valid: ${manifest.id} v${manifest.version} — ${stats.fileCount} files, ${stats.totalBytes} bytes`);
    if (command === 'validate') return;
  }

  if (command === 'pack') {
    const { makeZip } = await import('../src/lib/theme-package/zip');
    const zip = makeZip([...files.entries()].map(([name, data]) => ({ name, data })));
    const outPath = target.endsWith('.zip') ? target : `${target.replace(/[/\\]$/, '')}.zip`;
    writeFileSync(outPath, zip);
    // Round-trip verification: the archive we just wrote must validate again.
    const reread = (await import('../src/lib/theme-package/zip')).readZip(zip);
    if (!reread.ok) {
      console.error(`✗ Packaged ZIP failed re-read: ${reread.error}`);
      process.exit(1);
    }
    const recheck = validatePackage(new Map(reread.entries.map((e) => [e.name, e.data])));
    if (!recheck.ok) {
      console.error('✗ Packaged ZIP failed re-validation:');
      for (const error of recheck.errors) console.error(`  ${error.path}: ${error.message}`);
      process.exit(1);
    }
    console.log(`✓ Packed ${zip.byteLength} bytes → ${outPath} (round-trip validated)`);
    return;
  }

  if (command === 'install') {
    if (!zipBytes) {
      const { makeZip } = await import('../src/lib/theme-package/zip');
      zipBytes = makeZip([...files.entries()].map(([name, data]) => ({ name, data })));
    }
    if (!process.env.DATABASE_URL) {
      console.error('✗ DATABASE_URL is required for install.');
      process.exit(1);
    }
    // Provision the attribution-only CLI account (audit FK); unguessable
    // bcrypt hash, active=false — it can never sign in.
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
    const actor = {
      id: 'cli-installer',
      email: 'cli@local',
      name: 'CLI Installer',
      role: 'SUPER_ADMIN' as const,
    };
    const result = await installThemePackage(actor, zipBytes);
    if (!result.ok) {
      console.error(`✗ ${result.error}`);
      for (const error of result.errors ?? []) console.error(`  ${error.path}: ${error.message}`);
      process.exit(1);
    }
    console.log(`✓ Installed ${result.themeId} v${result.version}${result.updated ? ' (update)' : ''}`);
    return;
  }

  console.error(`Unknown command "${command}".`);
  process.exit(1);
}

void main();
