/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Crimson Text"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        felt: {
          dark: '#0a2e1a',
          mid: '#0d3b22',
          light: '#10472a',
          border: '#1a5c36',
        },
        gold: {
          dim: '#8B7340',
          DEFAULT: '#C9A84C',
          bright: '#F0C960',
        },
        card: {
          bg: '#fdf6e3',
          shadow: '#c8b89a',
        }
      },
      animation: {
        'deal': 'deal 0.3s ease-out forwards',
        'flip': 'flip 0.4s ease-in-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'shake': 'shake 0.4s ease-in-out',
      },
      keyframes: {
        deal: {
          '0%': { transform: 'translateY(-200px) rotate(-15deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
        },
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(201,168,76,0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(201,168,76,0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
      }
    },
  },
  plugins: [],
}
