/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F8F4E8',
          50: '#FFFFFF',
          100: '#FAF8F2',
          200: '#F8F4E8',
          300: '#ECE3CE',
          400: '#DFCFAB',
        },
        navy: {
          DEFAULT: '#102542',
          light: '#18365D',
          dark: '#0A182B',
          deep: '#06101E',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E6C865',
          dark: '#B39023',
          glow: 'rgba(212, 175, 55, 0.25)',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
        }
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 10px 30px -5px rgba(16, 37, 66, 0.06)',
        'soft-lg': '0 20px 40px -10px rgba(16, 37, 66, 0.1)',
        'glow-gold': '0 0 25px -5px rgba(212, 175, 55, 0.4)',
        'glow-navy': '0 0 25px -5px rgba(16, 37, 66, 0.35)',
        'glass': '0 8px 32px 0 rgba(16, 37, 66, 0.08)'
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'pulse-glow': 'pulseGlow 3s infinite ease-in-out',
      }
    },
  },
  plugins: [],
}

