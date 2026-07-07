import { createAppConfig } from '../../scripts/vite/createAppConfig.js';

export default createAppConfig(import.meta.url, {
  server: {
    host: true,
    port: 5176,
    strictPort: true,
    allowedHosts: ['.ngrok-free.app'],
  },
  includeTestConfig: false,
});
