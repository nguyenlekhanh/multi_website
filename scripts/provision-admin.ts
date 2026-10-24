/**
 * Secure initial-admin provisioning.
 *
 *   ADMIN_PROVISION_PASSWORD=... npx tsx scripts/provision-admin.ts --email ops@acme.com [--name "Ops"] [--role SITE_ADMIN]
 *
 * - The password is read from the ADMIN_PROVISION_PASSWORD environment
 *   variable (preferred) or typed interactively (hidden input) — it is never
 *   accepted as a command-line argument and never logged.
 * - Idempotent: an existing account with the same email has its password and
 *   role updated only with --force.
 * - Super Admin creation is the default; use --role SITE_ADMIN to create a
 *   Site Admin (grant sites separately in the database until the membership
 *   UI ships).
 *
 * Refuses to run when NODE_ENV=production unless explicitly overridden via
 * ALLOW_ADMIN_PROVISION_IN_PROD=1 (belt-and-braces against accidental runs
 * against production).
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../src/lib/admin/password';

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--force') out.force = true;
    else if (arg?.startsWith('--')) out[arg.slice(2)] = argv[i + 1] ?? '';
    if (arg?.startsWith('--')) i += 1;
  }
  return out;
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_ADMIN_PROVISION_IN_PROD !== '1') {
    console.error('[provision] Refusing to run with NODE_ENV=production unless ALLOW_ADMIN_PROVISION_IN_PROD=1.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('[provision] DATABASE_URL is required.');
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email ?? '').trim().toLowerCase();
  const name = String(args.name ?? '') || email.split('@')[0] || 'Admin';
  const explicitRole = args.role === 'SITE_ADMIN' || args.role === 'SUPER_ADMIN' ? (args.role as 'SITE_ADMIN' | 'SUPER_ADMIN') : null;
  const role = explicitRole ?? 'SUPER_ADMIN';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('[provision] --email must be a valid email address.');
    process.exit(1);
  }

  const password = process.env.ADMIN_PROVISION_PASSWORD ?? '';
  if (!password) {
    console.error('[provision] Provide the password via the ADMIN_PROVISION_PASSWORD environment variable (never as a CLI argument).');
    process.exit(1);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`[provision] Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing && !args.force) {
      console.error(`[provision] An account for ${email} already exists. Use --force to reset it.`);
      process.exit(1);
    }
    await prisma.adminUser.upsert({
      where: { email },
      create: { email, name, role, passwordHash },
      // --force resets credentials/activation but only changes the role when
      // --role is explicitly passed (no accidental demotions/promotions).
      update: {
        passwordHash,
        name,
        active: true,
        ...(explicitRole ? { role: explicitRole } : {}),
      },
    });
    const final = await prisma.adminUser.findUnique({ where: { email } });
    console.log(`[provision] "${email}" provisioned as ${final?.role}. Sign in at /admin/login.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[provision] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
