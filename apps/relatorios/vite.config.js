import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';

const appRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = path.resolve(appRoot, '../..');

export default defineConfig({
  root: appRoot,
  envDir: repoRoot,
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    allowedHosts: ['.ngrok-free.app'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(appRoot, './src') },
      { find: /^@macom\/api-client$/, replacement: path.resolve(repoRoot, './packages/api-client/src/index.js') },
      { find: /^@macom\/api-client\/(.*)$/, replacement: `${path.resolve(repoRoot, './packages/api-client/src')}/$1` },
      { find: /^@macom\/auth$/, replacement: path.resolve(repoRoot, './packages/auth/src/index.js') },
      { find: /^@macom\/auth\/(.*)$/, replacement: `${path.resolve(repoRoot, './packages/auth/src')}/$1` },
      { find: /^@macom\/test-utils$/, replacement: path.resolve(repoRoot, './packages/test-utils/src/index.js') },
      { find: /^@macom\/test-utils\/(.*)$/, replacement: `${path.resolve(repoRoot, './packages/test-utils/src')}/$1` },
      { find: /^@macom\/ui$/, replacement: path.resolve(repoRoot, './packages/ui/src/index.js') },
      { find: /^@macom\/ui\/(.*)$/, replacement: `${path.resolve(repoRoot, './packages/ui/src')}/$1` },
      { find: /^@macom\/validation$/, replacement: path.resolve(repoRoot, './packages/validation/src/index.js') },
      { find: /^@macom\/validation\/(.*)$/, replacement: `${path.resolve(repoRoot, './packages/validation/src')}/$1` },
    ],
  },
  build: {
    outDir: path.resolve(appRoot, './dist'),
    emptyOutDir: true,
  },
});
