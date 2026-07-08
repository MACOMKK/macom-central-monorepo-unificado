import baseTailwindConfig from '../../packages/config/tailwind/base.cjs';

export default {
  ...baseTailwindConfig,
  content: {
    relative: true,
    files: [
      './index.html',
      './src/**/*.{ts,tsx,js,jsx}',
      '../../packages/ui/src/**/*.{ts,tsx,js,jsx}',
    ],
  },
};
