/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Warm, calm "study desk" palette — easy on the eyes for long sessions.
        ink: '#0f1117',
        slate: {
          850: '#16181f',
          950: '#0b0d12',
        },
        brand: {
          DEFAULT: '#6ea8fe',
          soft: '#9ec1ff',
          deep: '#3f6fd1',
        },
        accent: '#f5b971', // warm highlight for streaks / encouragement
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'flip-in': {
          '0%': { transform: 'rotateX(90deg)', opacity: '0' },
          '100%': { transform: 'rotateX(0)', opacity: '1' },
        },
        'rise': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'flip-in': 'flip-in 0.35s ease-out',
        'rise': 'rise 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
