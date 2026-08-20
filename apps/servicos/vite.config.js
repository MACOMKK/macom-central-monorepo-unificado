import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { mergeConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { createAppConfig } from '../../scripts/vite/createAppConfig.js';

const { version } = createRequire(import.meta.url)('./package.json');

// A versao exibida no rodape da sidebar (Sidebar.jsx) precisa mudar a cada deploy pra dar pra
// confirmar visualmente que o build novo foi ao ar -- bumpar o "version" do package.json a mao
// nunca acontecia na pratica (ficou parado em 1.0.0 por meses). Em vez disso, anexa metadado de
// build (data + hash curto do commit) ao version base, que muda sozinho a cada commit/deploy sem
// exigir nenhuma acao manual. Funciona mesmo em clone raso (Vercel), pois so olha o HEAD atual.
function withBuildMetadata(baseVersion) {
  try {
    const date = execSync('git log -1 --format=%cd --date=format:%Y%m%d').toString().trim();
    const shortSha = execSync('git rev-parse --short HEAD').toString().trim();
    return `${baseVersion}+${date}.${shortSha}`;
  } catch {
    return baseVersion;
  }
}

const baseConfig = createAppConfig(import.meta.url, {
  server: {
    port: 5177,
    strictPort: true,
  },
  preview: {
    port: 4177,
    strictPort: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(withBuildMetadata(version)),
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
