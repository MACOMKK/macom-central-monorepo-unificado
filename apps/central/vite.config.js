import { mergeConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { createAppConfig } from '../../scripts/vite/createAppConfig.js';

const baseConfig = createAppConfig(import.meta.url, {
  server: {
    host: true,
    port: 5171,
    strictPort: true,
    allowedHosts: ['.ngrok-free.app'],
  },
  preview: {
    port: 4171,
    strictPort: true,
  },
});

export default mergeConfig(baseConfig, {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.svg', 'pwa-icons/*.png'],
      manifest: {
        id: '/',
        name: 'Central Macom',
        short_name: 'Central',
        description: 'Central Macom para gestao administrativa, acessos, ativos, linhas e operacoes internas.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#E30613',
        icons: [
          { src: '/pwa-icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,woff,png,ico}'],
        navigateFallback: '/index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
});
