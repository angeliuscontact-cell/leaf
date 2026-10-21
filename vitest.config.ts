import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: [
      // Vite 5's builtin detection omits `node:sqlite`, added in Node 22/24.
      { find: /^(?:node:)?sqlite$/, replacement: resolve(__dirname, 'tests/sqlite-shim.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      LEAF_DB_PATH: ':memory:',
      LEAF_UPLOADS_DIR: 'tests/tmp/uploads',
      APP_URL: 'http://localhost:5173',
      PUBLIC_APP_URL: 'http://localhost:5173',
      SESSION_DAYS: '7',
      AI_API_KEY: '',
    },
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    server: {
      deps: {
        // Vite 5's builtin list omits Node 24's `node:sqlite`.
        external: [/^node:sqlite$/],
      },
    },
  },
})
