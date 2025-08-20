/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'noto-sans-kr': ['"Noto Sans KR"', 'sans-serif'],
      },
      colors: {
        'brand-start': '#ff925c',
        'brand-end': '#f77c40'
      }
    },
  },
  plugins: [],
}