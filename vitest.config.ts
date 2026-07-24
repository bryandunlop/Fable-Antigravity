import { defineConfig } from 'vitest/config';
import path from 'path';

import { versionedAliases } from './vite.aliases';

// Test runner config, kept separate from vite.config.ts on purpose: importing
// the app config pulls in ESM-only Vite plugins (e.g. @tailwindcss/vite) that
// Vitest's config loader cannot require. Tests need none of those — only that
// imports resolve as the app resolves them. So we share just the alias map and
// let esbuild handle the JSX transform (tsconfig sets jsx: "react-jsx", which
// Vite's esbuild honours — no React plugin required to render a component).
export default defineConfig({
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      ...versionedAliases,
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Node is the default: the ~1500 pure-logic *.test.ts run fastest with no
    // DOM. Component tests opt into jsdom by file extension, so adding them
    // costs the logic suite nothing.
    //
    // environmentMatchGlobs is deprecated in Vitest 3 (replaced by
    // `test.projects`); on 2.1.x it is the supported, idiomatic mechanism.
    // Revisit when this repo moves to Vitest 3.
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
