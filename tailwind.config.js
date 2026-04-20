/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      spacing: {
        'card-w': '130px', // Šířka karty
        'card-h': '190px', // Výška karty
      },
      colors: {
        felt: {
          dark: '#0a2e1a',
          mid: '#0d3b22',
          border: '#1a5c36',
        },
        gold: {
          DEFAULT: '#C9A84C',
          bright: '#F0C960',
        },
        card: {
          bg: '#fdf6e3',
        }
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
