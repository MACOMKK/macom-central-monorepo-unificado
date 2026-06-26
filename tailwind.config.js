import baseTailwindConfig from './packages/config/tailwind/base.cjs';

export default {
  ...baseTailwindConfig,
  content: [
    './apps/admin/index.html',
    './apps/admin/src/**/*.{ts,tsx,js,jsx}',
    './apps/central/index.html',
    './apps/central/src/**/*.{ts,tsx,js,jsx}',
    './packages/ui/src/**/*.{ts,tsx,js,jsx}',
    './packages/auth/src/**/*.{ts,tsx,js,jsx}',
  ],
};
