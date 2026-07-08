import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appRoot = fileURLToPath(new URL('.', import.meta.url));

export default {
  plugins: {
    tailwindcss: {
      config: path.resolve(appRoot, './tailwind.config.js'),
    },
    autoprefixer: {},
  },
};
