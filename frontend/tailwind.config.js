/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Palette pulled from the Telugu Jamming Munich poster.
        ink: "#062826", // deepest teal (vignette)
        base: "#0a3b37", // page background
        surface: "#0e4a45", // cards / panels
        raised: "#12605a", // inputs / raised controls
        line: "#1d6f67", // borders
        cream: "#f6f0e2", // primary text
        muted: "#a3c3be", // secondary text
        brand: {
          DEFAULT: "#e5821e", // warm orange accent
          light: "#f4a23a",
          dark: "#c66d12",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "Avenir", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
