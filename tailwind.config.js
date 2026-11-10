/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        municipal: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9ddfd',
          300: '#7cc2fb',
          400: '#36a2f7',
          500: '#0c87eb',
          600: '#016bc9',
          700: '#0255a3',
          800: '#064886',
          900: '#0b3d6f',
          950: '#07264a',
        },
        risk: {
          high: '#dc2626',
          'high-bg': '#fef2f2',
          'high-border': '#fecaca',
          medium: '#d97706',
          'medium-bg': '#fffbeb',
          'medium-border': '#fde68a',
          low: '#16a34a',
          'low-bg': '#f0fdf4',
          'low-border': '#bbf7d0',
        }
      }
    },
  },
  plugins: [],
}
