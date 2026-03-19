/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        turf: {
          bg: '#080c14',
          card: '#0f1724',
          border: '#1e2d45',
          accent: '#00D4FF',
          green: '#39FF14',
          red: '#FF073A',
          purple: '#BF00FF',
          gold: '#FFD700',
          orange: '#FF6B35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
