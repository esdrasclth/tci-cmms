import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Los e2e levantan el AppModule completo: requieren Postgres arriba
// (`docker compose up -d postgres` desde la raiz del repo).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
