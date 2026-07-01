/** @type {import('tailwindcss').Config} */

// Colors are driven by CSS variables (space-separated RGB channels) so the whole
// UI can be re-themed at runtime by switching the `data-theme` on <html>.
// See src/index.css for the theme palettes and src/theme.js for the switcher.
const c = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: c("--c-ink"),
        base: c("--c-base"),
        surface: c("--c-surface"),
        raised: c("--c-raised"),
        line: c("--c-line"),
        cream: c("--c-cream"),
        muted: c("--c-muted"),
        onbrand: c("--c-onbrand"), // text/icon color to place on a brand-colored fill
        brand: {
          DEFAULT: c("--c-brand"),
          light: c("--c-brand-light"),
          dark: c("--c-brand-dark"),
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "Avenir", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
