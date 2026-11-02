/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta inspirada en Salesforce Lightning Design System (SLDS)
        sf: {
          brand: '#0176d3',
          'brand-dark': '#014486',
          'brand-darker': '#032d60',
          'brand-light': '#1b96ff',
          'brand-50': '#eef4ff',
          'brand-100': '#d8e6fe',
          bg: '#f3f3f3',
          'bg-alt': '#fafaf9',
          border: '#e5e5e5',
          'border-strong': '#c9c9c9',
          text: '#181818',
          'text-weak': '#444444',
          'text-weaker': '#747474',
          success: '#2e844a',
          'success-bg': '#ebf7e6',
          warning: '#dd7a01',
          'warning-bg': '#fef1e0',
          error: '#ba0517',
          'error-bg': '#feded8',
          info: '#0176d3',
        },
        // Colores de iconos de objeto estándar
        obj: {
          account: '#5867e8',
          lead: '#f88962',
          opportunity: '#ff5d2d',
          task: '#3ba755',
          contact: '#a094ed',
          home: '#ff538a',
          dashboard: '#ef6e64',
          recycle: '#04844b',
        },
        nexus: {
          50: '#eef4ff',
          100: '#d8e6fe',
          200: '#aacbff',
          300: '#78b0fd',
          400: '#1b96ff',
          500: '#0176d3',
          600: '#0b5cab',
          700: '#014486',
          800: '#032d60',
          900: '#001639',
          950: '#000d22',
        },
        // Se mantiene la escala bfg por compatibilidad hacia atrás
        bfg: {
          50: '#eef4ff',
          100: '#d8e6fe',
          200: '#aacbff',
          300: '#78b0fd',
          400: '#1b96ff',
          500: '#0176d3',
          600: '#0b5cab',
          700: '#014486',
          800: '#032d60',
          900: '#001639',
          950: '#000d22',
        },
      },
      fontFamily: {
        sans: [
          '"Salesforce Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 2px 2px 0 rgba(0, 0, 0, 0.10)',
        dropdown: '0 2px 3px 0 rgba(0, 0, 0, 0.16)',
        modal: '0 2px 8px 0 rgba(0, 0, 0, 0.25)',
        focus: '0 0 3px #0176d3',
      },
      borderRadius: {
        sf: '0.25rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translate(-50%, -12px)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(-16px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'slide-down': 'slide-down 0.25s ease-out',
        'slide-in-right': 'slide-in-right 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'modal-in': 'modal-in 0.22s ease-out',
      },
    },
  },
  plugins: [],
}
