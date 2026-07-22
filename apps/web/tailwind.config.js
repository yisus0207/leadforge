/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        leadforge: {
          bg: '#0B1220',
          card: '#111827',
          primary: '#06B6D4',
          secondary: '#22C55E',
          warning: '#F59E0B',
          critical: '#EF4444',
          text: '#F8FAFC',
          muted: '#94A3B8',
          border: '#1E293B',
          glow: 'rgba(6, 182, 212, 0.15)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 15px rgba(6, 182, 212, 0.25)',
        'glow-success': '0 0 15px rgba(34, 197, 94, 0.25)',
      }
    },
  },
  plugins: [],
}
