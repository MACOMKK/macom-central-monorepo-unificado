import { createReactAppEslintConfig } from '../../packages/config/eslint/base.js';

export default [
  createReactAppEslintConfig({
    files: ['src/**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    ignores: [],
  }),
];
