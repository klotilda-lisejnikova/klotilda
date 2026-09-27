import { defineConfig } from 'tsdown';

// One CommonJS bundle per entry point. `@klotilda/domain` ships TypeScript source, so it is
// bundled in; npm dependencies (be-core, bcrypt, …) stay external and load from node_modules.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'seed-admin': 'src/scripts/seed-admin.ts',
  },
  format: ['cjs'],
  platform: 'node',
  target: 'node24',
  fixedExtension: true,
  noExternal: [/^@klotilda\//],
  dts: false,
  clean: true,
});
