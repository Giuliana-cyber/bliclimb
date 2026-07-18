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
          dark: '#0a0c14',
          deep: '#0f1119',
          surface: '#161928',
          elevated: '#1d2030',
          cyan: '#00d4aa',
          'cyan-soft': '#5ee9c5',
          mustard: '#e8b931',
          'mustard-soft': '#f4d06f',
          coral: '#ff7a59',
          ink: '#f7f7fb'
        },
        // Tokens del sistema Stitch para las pantallas de Fase 4.
        // Traducidos literal del <script id="tailwind-config"> de cada
        // code.html de docs/design/. NO renombrar sin actualizar Stitch.
        'bil-cream': '#F2EDE3',
        'bil-green': '#2F7D63',
        'bil-red': '#D6463A',
        'bil-ink': '#241F1C'
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        // Nunito Sans para las pantallas de Stitch (Fase 4 UI).
        nunito: ['var(--font-nunito-sans)', 'Nunito Sans', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'gradient-glow':
          'radial-gradient(circle at top left, rgba(0,212,170,0.18), transparent 60%), radial-gradient(circle at bottom right, rgba(232,185,49,0.10), transparent 55%)',
        'gradient-card':
          'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-cyan': 'linear-gradient(135deg, #00d4aa 0%, #5ee9c5 100%)',
        'gradient-mustard': 'linear-gradient(135deg, #e8b931 0%, #f4d06f 100%)'
      },
      boxShadow: {
        glow: '0 0 32px rgba(0, 212, 170, 0.18)',
        'glow-strong': '0 0 56px rgba(0, 212, 170, 0.30)',
        'glow-mustard': '0 0 36px rgba(232, 185, 49, 0.22)',
        soft: '0 12px 32px -16px rgba(0, 0, 0, 0.6)',
        lifted: '0 24px 56px -28px rgba(0, 212, 170, 0.45)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' }
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both'
      }
    }
  },
  plugins: []
};

export default config;
