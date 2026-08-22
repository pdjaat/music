/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0b0f',
          900: '#101218',
          850: '#14161d',
          800: '#181b24',
          700: '#1f2330',
          600: '#2a2f40',
        },
        accent: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
        rose2: {
          400: '#fb7185',
          500: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #ff8a00 0%, #ff2e63 100%)',
        'brand-soft': 'linear-gradient(135deg, rgba(255,138,0,0.16) 0%, rgba(255,46,99,0.14) 100%)',
      },
      boxShadow: {
        glow: '0 0 40px rgba(255,138,0,0.25)',
        card: '0 8px 30px rgba(0,0,0,0.35)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        eq: {
          '0%, 100%': { height: '30%' },
          '50%': { height: '100%' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.35s ease both',
        eq: 'eq 0.9s ease-in-out infinite',
        spinSlow: 'spinSlow 18s linear infinite',
      },
    },
  },
  plugins: [],
};
