/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chess-dark': '#3a291c',
        'chess-light': '#d2a679',
        'chess-selected': '#f0d090',
        'chess-move': '#8b9dc3',
      },
    },
  },
  plugins: [],
}

