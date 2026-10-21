/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdcff',
          300: '#8fc7ff',
          400: '#5aa8ff',
          500: '#1677ff',
          600: '#0d5fd6',
          700: '#0c4ba8',
          800: '#103f86',
          900: '#133665',
        },
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', '-apple-system', '"Segoe UI"', 'sans-serif'],
        serif: ['"Source Serif 4 Variable"', 'Georgia', 'serif'],
        mono: ['"SFMono-Regular"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      screens: {
        xs: '420px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.12)',
        lift: '0 2px 4px rgba(15, 23, 42, 0.05), 0 18px 48px -18px rgba(15, 23, 42, 0.24)',
        float: '0 30px 90px -30px rgba(15, 45, 90, 0.38)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.22,.61,.36,1) both',
        shimmer: 'shimmer 1.4s infinite',
        float: 'float 7s ease-in-out infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
      },
    },
  },
  plugins: [],
}
