import { createAppConfig } from '../../scripts/vite/createAppConfig.js';

export default createAppConfig(import.meta.url, {
  server: {
    host: true,
    port: 5174,
    allowedHosts: ['.ngrok-free.app'],
  },
  includeTestConfig: false,
});
