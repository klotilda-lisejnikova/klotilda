import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests build a real Postgres schema per file.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
