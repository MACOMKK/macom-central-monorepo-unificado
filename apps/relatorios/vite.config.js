import { mergeConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { createAppConfig } from '../../scripts/vite/createAppConfig.js';

const baseConfig = createAppConfig(import.meta.url, {
  server: {
    host: true,
    port: 5174,
    allowedHosts: ['.ngrok-free.app'],
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
  includeTestConfig: false,
});

export default mergeConfig(baseConfig, {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.svg', 'pwa-icons/*.png'],
      manifest: {
        id: '/',
        name: 'Relatórios Macom',
        short_name: 'Relatórios',
        description: 'Portal de relatorios e indicadores da MACOM para consulta de dados e acompanhamento operacional.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f3f3f3',
        theme_color: '#0f3d2e',
        icons: [
          { src: '/pwa-icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,woff,png,ico}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request }) => ['script', 'style', 'image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-shell-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
