/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#1A2B2A',
        mist: '#F7FAF9',
        teal: {
          DEFAULT: '#2F6F68',
          soft: '#D8EDE9',
          deep: '#1F4F4A',
        },
      },
      fontFamily: {
        display: ['"Zen Maru Gothic"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        body: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(47, 111, 104, 0.08)',
      },
    },
  },
  plugins: [],
};
