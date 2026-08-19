import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// A ferramenta sempre escreve os arquivos gerados ao lado da imagem de origem (nao tem opcao de
// outDir) -- depois de rodar `npm run generate:pwa-icons`, mover manualmente os PNGs de
// `resources/` pra `public/pwa-icons/` (mantendo `resources/icon.png`, que tambem e o source do
// icone Android/Capacitor).
export default defineConfig({
  preset: minimal2023Preset,
  images: ['./resources/icon.png'],
});
