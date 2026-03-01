import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            img: { marginTop: '1.5rem', marginBottom: '1.5rem', borderRadius: '0.5rem' },
            table: { fontSize: '0.85rem' },
            'th, td': { padding: '0.5rem 0.75rem' },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
