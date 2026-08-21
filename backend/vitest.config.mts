import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Vitest en lugar de Jest: better-auth y sus dependencias son ESM-only y usan
 * `import.meta`, que no se puede transpilar a CommonJS. Jest (CJS) revienta al
 * importar cualquier archivo que llegue a better-auth; Vitest corre ESM nativo.
 *
 * unplugin-swc hace la compilacion de TypeScript conservando los decoradores y
 * la metadata que NestJS necesita para la inyeccion de dependencias.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.spec.ts'],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
