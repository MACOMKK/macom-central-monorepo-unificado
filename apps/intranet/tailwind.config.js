import baseTailwindConfig from '../../packages/config/tailwind/base.cjs';

export default {
  ...baseTailwindConfig,
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    '../../packages/ui/src/**/*.{ts,tsx,js,jsx}',
    '../../packages/auth/src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    ...baseTailwindConfig.theme,
    extend: {
      ...baseTailwindConfig.theme.extend,
      colors: {
        ...baseTailwindConfig.theme.extend.colors,
        macom: {
          red: '#E30613',
          'red-dark': '#b80010',
          black: '#141414',
          'black-soft': '#222222',
          gray: '#f2f2f2',
        },
      },
    },
  },
};
