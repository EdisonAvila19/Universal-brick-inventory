/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#715d00",
        "primary-container": "#f2cd37",
        secondary: "#5f5e5e",
        surface: "#fcf9f8",
        "on-surface": "#1b1c1c",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "tertiary-container": "#62dfff",
        "on-tertiary-container": "#006173",
        "surface-container-low": "#f6f3f2",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#eae7e7",
        "surface-container-highest": "#e4e2e1",
        "outline-variant": "#d0c6ad"
      },
      borderRadius: {
        xl: "0.5rem",
        full: "0.75rem"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      },
      animation: {
        shake: 'shake 0.5s ease-in-out both',
        'fade-in': 'fade-in 0.3s ease-in both',
        'fade-out': 'fade-out 0.3s ease-out both',
        'slide-in-top': 'slide-in-top 0.3s ease-out both',
        'slide-out-top': 'slide-out-top 0.3s ease-out both'
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '50%': { transform: 'translateX(10px)' },
          '75%': { transform: 'translateX(-10px)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        'slide-in-top': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-out-top': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-20px)' }
        }
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms"), 
    require("@tailwindcss/container-queries"),
    require("@midudev/tailwind-animations")
  ]
};