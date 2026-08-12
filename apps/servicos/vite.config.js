import { createRequire } from 'node:module';

import { createAppConfig } from '../../scripts/vite/createAppConfig.js';

const { version } = createRequire(import.meta.url)('./package.json');

export default createAppConfig(import.meta.url, {
  server: {
    port: 5177,
    strictPort: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
});
