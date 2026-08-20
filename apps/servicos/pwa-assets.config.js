import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Fonte compartilhada com os demais apps (favicon.svg de fundo transparente) -- `resources/icon.png`
// continua existindo só como source do icone nativo Android/Capacitor (fundo solido na cor da marca
// e um requisito desse contexto, nao do PWA web). Usar `resources/icon.png` aqui reintroduz o bug do
// quadrado vermelho no instalavel PWA/preview de link, ja visto em producao -- nao trocar de volta.
export default defineConfig({
  preset: minimal2023Preset,
  images: ['../../packages/assets/favicon.svg'],
});
