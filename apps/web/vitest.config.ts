import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// The root cause: in this pnpm monorepo, @testing-library/react (hoisted to root)
// imports react-dom from the ROOT node_modules, which in turn imports react from
// the ROOT. But our source code imports react from the WEB app's local copy.
// Two different React instances → hooks crash.
//
// Fix: alias react and react-dom to the ROOT copies, so everything (our code,
// react-dom, testing-library) uses the same instance.
const rootNodeModules = path.resolve(__dirname, '../../node_modules');

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
    passWithNoTests: true,
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Point to the root node_modules so all React imports resolve to
      // the same copy used by @testing-library/react and react-dom
      'react': path.join(rootNodeModules, 'react'),
      'react-dom': path.join(rootNodeModules, 'react-dom'),
    },
  },
});
