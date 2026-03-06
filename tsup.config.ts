import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI entry point — needs the shebang
  {
    entry: { 'bin/figma-bridge': 'bin/figma-bridge.ts' },
    format: ['esm'],
    sourcemap: true,
    clean: true,
    target: 'node18',
    splitting: false,
    shims: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  // Library entry point
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: false, // Don't wipe CLI output
    target: 'node18',
    splitting: false,
    shims: true,
  },
]);
