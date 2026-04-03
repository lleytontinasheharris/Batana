// web/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Zimbabwe-inspired palette
        earth: {
          50: '#faf8f5',
          100: '#f2ede4',
          200: '#e5d9c7',
          300: '#d4c0a3',
          400: '#c4a57e',
          500: '#a8845a', // Primary ochre
          600: '#8c6a44',
          700: '#6f5336',
          800: '#523c28',
          900: '#3a2a1c',
        },
        clay: {
          50: '#f9f6f3',
          100: '#f0e9e1',
          200: '#ded0c0',
          300: '#c8b29d',
          400: '#b39578',
          500: '#967554', // Terracotta
          600: '#7a5c43',
          700: '#5e4634',
          800: '#443126',
          900: '#2e211a',
        },
        savanna: {
          50: '#f4f7f0',
          100: '#e6edd9',
          200: '#cddbb3',
          300: '#b0c688',
          400: '#93b05d',
          500: '#748c3d', // Deep green
          600: '#5d7030',
          700: '#475626',
          800: '#333e1c',
          900: '#232a14',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Gold accent
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.2' }],
      },
      borderRadius: {
        'clay': '1.5rem',
        'clay-sm': '0.75rem',
        'clay-lg': '2.5rem',
      },
      boxShadow: {
        'clay': '0 8px 16px -4px rgba(168, 132, 90, 0.15), 0 4px 8px -2px rgba(168, 132, 90, 0.08)',
        'clay-hover': '0 12px 24px -6px rgba(168, 132, 90, 0.2), 0 6px 12px -3px rgba(168, 132, 90, 0.12)',
        'clay-inner': 'inset 0 2px 8px rgba(168, 132, 90, 0.1)',
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;