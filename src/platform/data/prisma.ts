import { PrismaClient } from '@prisma/client';

/**
 * Single PrismaClient per process.
 *
 * Next.js hot-reloads modules in development, which would otherwise open a
 * new connection pool per reload; storing the client on globalThis keeps one
 * pool per server process. In production each server instance creates exactly
 * one pool, shared across all requests. Never construct PrismaClient
 * elsewhere — import `getPrisma()` (or the `prisma` convenience export).
 *
 * Credentials come from DATABASE_URL only — never bundled into client code
 * because this module is imported exclusively from server components/actions.
 */

const GLOBAL_KEY = '__multiSitePrisma';

function createClient(): PrismaClient {
  return new PrismaClient({
    datasources: process.env.DATABASE_URL ? { db: { url: process.env.DATABASE_URL } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export function getPrisma(): PrismaClient {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: PrismaClient };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createClient();
  }
  return g[GLOBAL_KEY];
}

/** Convenience export for scripts (CLI seed, tests). */
export const prisma: PrismaClient = getPrisma();
