/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0b66c3',
        accent: '#21a366',
        bg: '#f5f7fa',
      },
      borderRadius: {
        'lg-2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
