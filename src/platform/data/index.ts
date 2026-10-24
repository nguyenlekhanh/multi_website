import type { DataAdapter } from './adapter';
import { PostgresDataAdapter } from './postgres-adapter';
import { SeedDataAdapter } from './seed-adapter';
import { getPrisma } from './prisma';

/**
 * Data source selection — the single switch between demo and production data.
 *
 *   DATA_SOURCE=seed      typed demo fixtures (development/demo only)
 *   DATA_SOURCE=postgres  real PostgreSQL via the Prisma-backed adapter
 *   unset                 development defaults to seed with a log line;
 *                         production FAILS — the data source must be explicit,
 *                         and a failed production database never silently
 *                         serves seed content.
 *
 * Setting DATABASE_URL alone does NOT switch the data source; only
 * DATA_SOURCE=postgres does, and that adapter genuinely queries the database
 * (see postgres-adapter.ts). Failures surface as DataUnavailableError and are
 * rendered as an availability page — never as seed content.
 *
 * Middleware does not import this module (Edge Runtime): it only stamps
 * headers, and the site resolver here performs all database lookups.
 */

export type DataSourceMode = 'seed' | 'postgres';

export function resolveDataSourceMode(): DataSourceMode {
  const raw = process.env.DATA_SOURCE?.trim().toLowerCase();
  if (raw === 'postgres' || raw === 'postgresql' || raw === 'pg') return 'postgres';
  if (raw === 'seed') return 'seed';
  if (raw === undefined || raw === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[platform] DATA_SOURCE is required in production. Set DATA_SOURCE=postgres (real database) ' +
          'or DATA_SOURCE=seed (demo fixtures) — refusing to guess in production.',
      );
    }
    return 'seed';
  }
  throw new Error(
    `[platform] Invalid DATA_SOURCE "${raw}". Supported values: seed, postgres.`,
  );
}

function createDataAdapter(): DataAdapter {
  const mode = resolveDataSourceMode();
  if (mode === 'postgres') {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        '[platform] DATA_SOURCE=postgres requires DATABASE_URL ' +
          '(e.g. postgresql://user:password@host:5432/db). ' +
          'The application will not start against a database it cannot address.',
      );
    }
    console.log('[platform] Data source: PostgreSQL (Prisma).');
    return new PostgresDataAdapter(getPrisma());
  }
  console.log('[platform] Data source: typed seed data.');
  return new SeedDataAdapter();
}

export const db: DataAdapter = createDataAdapter();
export { DataUnavailableError, isDataUnavailableError } from './errors';
export type { DataAdapter } from './adapter';
