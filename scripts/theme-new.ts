/**
 * Theme Starter Kit CLI — scaffold a new MSP Theme Package v1 from a name.
 *
 *   npm run theme:new -- "My Theme" [--slug my-theme] [--author "Name"]
 *                        [--url https://… ] [--description "…"]
 *                        [--dir theme-packages]
 *
 * The generated package passes `theme:validate` unmodified.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  out._ = positional.join(' ');
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const name = String(args._ ?? '').trim();
  if (!name) {
    console.error('Usage: npm run theme:new -- "Theme Name" [--slug my-theme] [--author "Name"] [--url https://…] [--description "…"] [--dir theme-packages]');
    process.exit(1);
  }

  const { scaffoldStarterPackage } = await import('../src/lib/theme-package/starter');
  const { validatePackage } = await import('../src/lib/theme-package/validate');

  const result = scaffoldStarterPackage({
    name,
    slug: typeof args.slug === 'string' ? args.slug : undefined,
    description: typeof args.description === 'string' ? args.description : undefined,
    authorName: typeof args.author === 'string' ? args.author : undefined,
    authorUrl: typeof args.url === 'string' ? args.url : undefined,
  });
  if (!result.ok) {
    console.error(`✗ ${result.error}`);
    process.exit(1);
  }

  const dir = resolve(process.cwd(), typeof args.dir === 'string' ? args.dir : 'theme-packages');
  const target = join(dir, result.slug);
  if (existsSync(target)) {
    console.error(`✗ Directory already exists: ${target}`);
    process.exit(1);
  }

  // Belt and braces: the scaffold must be validator-clean before touching disk.
  const check = validatePackage(result.files);
  if (!check.ok) {
    console.error(`✗ Generated package failed validation (bug — please report):`);
    for (const error of check.errors) console.error(`  ${error.path}${error.field ? ` · ${error.field}` : ''}: ${error.message}`);
    process.exit(1);
  }

  for (const [name2, data] of result.files) {
    const file = join(target, name2);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, data);
  }

  console.log(`✓ Scaffolded ${check.pkg.manifest.name} (${result.slug} v${check.pkg.manifest.version}) — ${check.pkg.stats.fileCount} files, ${check.pkg.stats.totalBytes} bytes`);
  console.log(`  ${target}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  npm run theme:validate -- theme-packages/${result.slug}`);
  console.log(`  npm run theme:pack     -- theme-packages/${result.slug}`);
  console.log(`  → then: upload the ZIP in Admin → Theme library, or preview it`);
  console.log(`    with demo content in Admin → Preview lab (nothing gets installed).`);
}

void main();
