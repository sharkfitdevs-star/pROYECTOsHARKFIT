/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#764ba2',
          dark: '#5b2f80',
          light: '#9b6fc4',
        },
        surface: {
          DEFAULT: '#1e1e2e',
          card: '#2a2d43',
          sidebar: '#764ba2',
        },
        neutral: {
          bg: '#eef1f6',
          border: '#3c405c',
          muted: '#94a3b8',
        },
        success: '#4ade80',
        danger: '#f87171',
        warning: '#fbbf24',
        accent: '#a78bfa',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

