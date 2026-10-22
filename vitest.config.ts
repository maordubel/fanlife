import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      // `server-only` is a build-time guard for the client bundle; under Node it has
      // nothing to do, so the tests stub it rather than pretending to be a bundler.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    // in CI a failing test becomes a check annotation, readable through the checks API (the job log is not)
    reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions'] : ['default'],
    environment: 'node',
    env: { NEXT_PUBLIC_FAN_LIFE_EVALUATION: 'false' },
    include: ['tests/**/*.test.ts'],
  },
})
