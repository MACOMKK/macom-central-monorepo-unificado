import baseTailwindConfig from '../../packages/config/tailwind/base.cjs';

export default {
  ...baseTailwindConfig,
  theme: {
    ...baseTailwindConfig.theme,
    extend: {
      ...baseTailwindConfig.theme.extend,
      colors: {
        ...baseTailwindConfig.theme.extend.colors,
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
      },
    },
  },
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    '../../packages/ui/src/**/*.{ts,tsx,js,jsx}',
    '../../packages/auth/src/**/*.{ts,tsx,js,jsx}',
  ],
};
