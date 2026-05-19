/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Direction artistique : noir profond + violet électrique + blanc + gris foncé
        ink: {
          DEFAULT: '#000000',
          900: '#050507',
          800: '#0A0A0E',
          700: '#101015',
          600: '#16161D',
          500: '#1E1E27',
        },
        izy: {
          violet: '#8B5CF6',
          'violet-bright': '#A78BFA',
          'violet-deep': '#6D28D9',
          'violet-glow': '#C4B5FD',
        },
        line: 'rgba(255,255,255,0.06)',
        'line-mid': 'rgba(255,255,255,0.10)',
        'line-strong': 'rgba(255,255,255,0.16)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
