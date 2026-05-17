/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:   { DEFAULT: '#1B2A4A', light: '#2d4a7a', dark: '#111c30' },
        orange: { DEFAULT: '#E87722', light: '#f09040', dark: '#cf6610' },
        cream:  '#F5F0EB',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
