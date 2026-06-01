/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
theme: {
    extend: {
      backgroundImage: {
        'custom-gradient': "linear-gradient(to left, #FAFDEE,#1F3A4B )",
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      colors: {
        'neon-green': '#00FF00',
      },
    },
  },
  plugins: [],
}

