import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,js}'],
    exclude: ['node_modules', 'dist', 'tests/fixtures'],
    environment: 'node',
    tsconfig: './tsconfig.test.json',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: ['src/types/**/*', 'src/**/*.d.ts', 'src/index.ts'],
    },
  },
})
