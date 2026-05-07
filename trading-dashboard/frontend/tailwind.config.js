/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          green:  '#00ff88',
          cyan:   '#00e5ff',
          pink:   '#ff2d9b',
          purple: '#bf5af2',
          orange: '#ff9f0a',
          red:    '#ff453a',
        },
        dark: {
          900: '#04040f',
          800: '#07071a',
          700: '#0d0d28',
          600: '#141435',
          500: '#1a1a45',
          400: '#252560',
        },
      },
      boxShadow: {
        'neon-green':  '0 0 8px #00ff88, 0 0 20px #00ff8855, 0 0 40px #00ff8822',
        'neon-cyan':   '0 0 8px #00e5ff, 0 0 20px #00e5ff55, 0 0 40px #00e5ff22',
        'neon-pink':   '0 0 8px #ff2d9b, 0 0 20px #ff2d9b55, 0 0 40px #ff2d9b22',
        'neon-orange': '0 0 8px #ff9f0a, 0 0 20px #ff9f0a55',
        'neon-red':    '0 0 8px #ff453a, 0 0 20px #ff453a55',
        'card':        '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      dropShadow: {
        'neon-green': '0 0 6px #00ff88',
        'neon-cyan':  '0 0 6px #00e5ff',
        'neon-pink':  '0 0 6px #ff2d9b',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'fadeIn':     'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          from: { opacity: '0.7' },
          to:   { opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
