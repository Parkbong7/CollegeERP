/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "../shell/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        sunset: {
          cream: '#FFF8F1',
          peach: '#FCE6D8',
          blush: '#F5D2C2',
          terracotta: '#C66B45',
          orange: '#AD5938',
          brown: '#553729',
          olive: '#929071',
          border: '#EBD9CB',
        }
      }
    },
  },
  plugins: [],
};
