// Selectable UI color themes. Each `swatch` is [background, accent] for the picker chip.
export const THEMES = [
  { id: "telugu", name: "Teal & Gold", swatch: ["#0a3b37", "#e5821e"] },
  { id: "metallics", name: "Classic Metallics", swatch: ["#131110", "#d1b280"] },
  { id: "aqua", name: "Aqua Blues", swatch: ["#003f3a", "#34b3a3"] },
  { id: "reds", name: "Wintery Reds", swatch: ["#24100f", "#d72c16"] },
  { id: "cultured", name: "Bold & Cultured", swatch: ["#302838", "#f2c057"] },
  { id: "berry", name: "Berry Blues", swatch: ["#1e1f26", "#6f97d8"] },
];

const KEY = "jamlyrics_theme";
const DEFAULT = "telugu";

export function getTheme() {
  const saved = localStorage.getItem(KEY);
  return THEMES.some((t) => t.id === saved) ? saved : DEFAULT;
}

export function setTheme(id) {
  const theme = THEMES.some((t) => t.id === id) ? id : DEFAULT;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEY, theme);
}

// Apply the saved theme immediately (called before React renders).
export function applyInitialTheme() {
  document.documentElement.dataset.theme = getTheme();
}
