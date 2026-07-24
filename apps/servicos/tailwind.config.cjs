const baseTailwindConfig = require('../../packages/config/tailwind/base.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseTailwindConfig,
  darkMode: ['class'],
  content: {
    relative: true,
    files: ['./index.html', './src/**/*.{js,jsx}', '../../packages/ui/src/**/*.{js,jsx}'],
  },
};
