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
      }
    }
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")]
};