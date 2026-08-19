import { createRequire } from 'node:module';

import { mergeConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { createAppConfig } from '../../scripts/vite/createAppConfig.js';

const { version } = createRequire(import.meta.url)('./package.json');

const baseConfig = createAppConfig(import.meta.url, {
  server: {
    port: 5177,
    strictPort: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
});

export default mergeConfig(baseConfig, {
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.svg', 'pwa-icons/*.png'],
      manifest: {
        id: '/',
        name: 'MACOM Servicos',
        short_name: 'Servicos',
        description: 'Sistema MACOM Servicos — atendimento, oficina, financeiro, estoque, compras e RH.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f4f4f5',
        theme_color: '#E30613',
        icons: [
          { src: '/pwa-icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,woff,png,ico}'],
      },
      devOptions: { enabled: false },
    }),
  ],
});
