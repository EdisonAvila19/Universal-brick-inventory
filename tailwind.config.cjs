/** @type {import('tailwindcss').Config} */

module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-container": "var(--color-primary-container)",
        "primary-container-contrast": "var(--color-primary-container-contrast)",
        secondary: "var(--color-secondary)",
        surface: "var(--color-surface)",
        "on-surface": "var(--color-on-surface)",
        error: "var(--color-error)",
        "error-container": "var(--color-error-container)",
        "on-error-container": "var(--color-on-error-container)",
        "tertiary-container": "var(--color-tertiary-container)",
        "on-tertiary-container": "var(--color-on-tertiary-container)",
        "surface-container-low": "var(--color-surface-container-low)",
        "surface-container-lowest": "var(--color-surface-container-lowest)",
        "surface-container-high": "var(--color-surface-container-high)",
        "surface-container-highest": "var(--color-surface-container-highest)",
        "outline-variant": "var(--color-outline-variant)",
        "selected": "var(--color-selected)",
        "filter": "var(--color-filter)",
        "on-filter": "var(--color-on-filter)"
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