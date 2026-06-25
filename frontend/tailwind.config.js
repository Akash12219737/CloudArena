/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Brand palette
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Cyber accent
        cyber: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        // Dark surface
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          700: '#334155',
          800: '#1e293b',
          850: '#162032',
          900: '#0f172a',
          950: '#080d1a',
        },
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'hero-gradient': 'linear-gradient(135deg, #080d1a 0%, #0f172a 40%, #162032 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(99,102,241,0.06) 0%, rgba(16,185,129,0.04) 100%)',
        'glow-brand': 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          from: { boxShadow: '0 0 10px rgba(99,102,241,0.3)' },
          to:   { boxShadow: '0 0 25px rgba(99,102,241,0.6), 0 0 50px rgba(99,102,241,0.3)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      boxShadow: {
        'brand-sm': '0 0 10px rgba(99,102,241,0.3)',
        'brand-md': '0 0 20px rgba(99,102,241,0.4)',
        'brand-lg': '0 0 40px rgba(99,102,241,0.5)',
        'cyber-sm': '0 0 10px rgba(16,185,129,0.3)',
        'cyber-md': '0 0 20px rgba(16,185,129,0.4)',
      },
    },
  },
  plugins: [],
}
