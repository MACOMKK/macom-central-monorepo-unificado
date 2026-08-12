import type { CapacitorConfig } from '@capacitor/cli';

// AJUSTAR antes de publicar na loja: appId e definitivo assim que o app for publicado,
// nao da pra mudar depois sem virar um app novo. Placeholder ate confirmar o dominio
// oficial da MACOM.
const config: CapacitorConfig = {
  appId: 'br.com.macom.servicos',
  appName: 'MACOM Serviços',
  webDir: 'dist',
};

export default config;
