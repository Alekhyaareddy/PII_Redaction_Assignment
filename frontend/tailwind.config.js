/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(59, 130, 246, 0.1), 0 20px 50px rgba(14, 165, 233, 0.15)',
      },
      colors: {
        night: '#020817',
        panel: '#0f172a',
      },
    },
  },
  plugins: [],
}
