import { createReactAppEslintConfig } from './packages/config/eslint/base.js';

export default [
  createReactAppEslintConfig({
    files: [
      "apps/central/src/components/**/*.{js,mjs,cjs,jsx}",
      "apps/central/src/pages/**/*.{js,mjs,cjs,jsx}",
      "apps/central/src/App.jsx",
    ],
    ignores: ['apps/central/src/lib/**/*', 'apps/central/src/components/ui/**/*'],
  }),
];
