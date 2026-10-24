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
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 120000,
    // Keep every Prisma pool small: the local verification database runs
    // with a tight connection budget.
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
