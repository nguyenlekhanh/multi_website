import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  esbuild: {
    // Themes are .tsx components; transform JSX the same way Next.js does.
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    testTimeout: 30000,
    hookTimeout: 120000,
    // The integration suites share one verification database — several of
    // them wipe and reseed it (postgres-adapter) or manage fixture rows
    // (content-service, phase8) — so test FILES must never run in parallel.
    // (Vitest 4 removed poolOptions; this is its supported replacement.)
    fileParallelism: false,
  },
});
