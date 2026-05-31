/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sp-black': '#000000',
        'sp-base': '#121212',
        'sp-card': '#181818',
        'sp-elevated': '#282828',
        'sp-hover': '#2a2a2a',
        'sp-green': '#1DB954',
        'sp-green-hover': '#1ed760',
        'sp-text': '#FFFFFF',
        'sp-muted': '#A7A7A7',
        'sp-faint': '#535353',
      },
      fontFamily: {
        sans: [
          'Circular',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
