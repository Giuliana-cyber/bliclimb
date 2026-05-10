import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f1119',
          cyan: '#00d4aa',
          mustard: '#e8b931'
        }
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 32px rgba(0, 212, 170, 0.18)'
      }
    }
  },
  plugins: []
};

export default config;
