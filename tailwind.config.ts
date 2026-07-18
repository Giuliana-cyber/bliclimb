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
        // Tokens Stitch (Welcome · carpeta_2/bienvenido_a_bilclimb).
        // Sistema de autenticación. Traducidos literal del code.html.
        'bil-cream': '#F2EDE3',
        'bil-green': '#2F7D63',
        // bil-red es el ÚNICO token de rojo de acción (CTA principal).
        // Todos los botones de "Empezar sesión", "Crear cuenta", etc.
        // deben usar bg-bil-red text-white. NO usar `secondary` (#b12b23,
        // MD3 legacy más oscuro), NO hardcodear #D6463A, NO tomar valores
        // de screenshots. Un token, todas las pantallas.
        'bil-red': '#D6463A',
        'bil-ink': '#241F1C',
        // Ampliación aprobada por Giuliana 2026-07-17:
        // - bil-gold: streak badge (racha) + border-l del callout
        //   "¿por qué esto hoy?" que antes usaba wood-tan del sistema MD3.
        // - bil-navy: acento de Senda (planning screens · headers cuando
        //   Senda es el coach activo).
        'bil-gold': '#F2B23C',
        'bil-navy': '#21395A',
        // Sistema Material Design 3 · Stitch (app autenticada).
        // Traducidos del code.html de carpeta_3/hoy_bilclimb_1 y afines.
        // NO renombrar · las pantallas Stitch los referencian directo.
        primary: '#0a644b',
        'primary-container': '#2f7d63',
        'primary-fixed': '#a5f2d2',
        'primary-fixed-dim': '#89d6b7',
        'on-primary': '#ffffff',
        'on-primary-fixed': '#002116',
        'on-primary-fixed-variant': '#00513c',
        'on-primary-container': '#d2ffea',
        secondary: '#b12b23',
        'secondary-container': '#fd6253',
        'secondary-fixed': '#ffdad5',
        'secondary-fixed-dim': '#ffb4aa',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#650003',
        'on-secondary-fixed': '#410001',
        'on-secondary-fixed-variant': '#8f100e',
        tertiary: '#755000',
        'tertiary-container': '#956700',
        'tertiary-fixed': '#ffdeac',
        'tertiary-fixed-dim': '#fcbb44',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#fff3e5',
        'on-tertiary-fixed': '#281900',
        'on-tertiary-fixed-variant': '#604100',
        surface: '#fef9ef',
        'surface-bright': '#fef9ef',
        'surface-dim': '#dedad0',
        'surface-tint': '#176b52',
        'surface-variant': '#e7e2d8',
        'surface-container': '#f2ede3',
        'surface-container-low': '#f8f3e9',
        'surface-container-high': '#ede8de',
        'surface-container-highest': '#e7e2d8',
        'on-surface': '#1d1c16',
        'on-surface-variant': '#3f4944',
        'inverse-surface': '#32302a',
        'inverse-on-surface': '#f5f0e6',
        'inverse-primary': '#89d6b7',
        background: '#fef9ef',
        'on-background': '#1d1c16',
        outline: '#6f7974',
        'outline-variant': '#bec9c2',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        // Marca (usados por pantallas de coach + acentos)
        'wood-tan': '#CDA96E',
        'deep-forest': '#24614D',
        'senda-navy': '#21395A',
        'ink-text': '#241F1C'
      },
      // Tipografía Stitch · tokens por rol semántico
      fontSize: {
        'display-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'headline-md-mobile': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '700' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '600' }]
      },
      spacing: {
        base: '8px',
        gutter: '16px',
        'card-padding': '24px',
        'margin-mobile': '20px',
        'margin-desktop': '40px',
        'touch-target': '48px'
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
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        '2xl': '1.25rem',
        full: '9999px'
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
