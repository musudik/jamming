import { useEffect, useRef, useState } from "react";
import { THEMES, getTheme, setTheme } from "../theme.js";

// A compact "choose your colours" control: a palette button that opens a
// popover of theme swatches. Applies instantly and persists across the app.
export default function ThemePicker({ className = "" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(getTheme());
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  function choose(id) {
    setTheme(id);
    setActive(id);
  }

  const current = THEMES.find((t) => t.id === active) || THEMES[0];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-cream"
        aria-label="Choose colour theme"
        title="Colour theme"
      >
        <span
          className="h-4 w-4 rounded-full border border-white/20"
          style={{
            background: `conic-gradient(${current.swatch[1]} 0 50%, ${current.swatch[0]} 0 100%)`,
          }}
        />
        <span className="hidden sm:inline">Theme</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-xl">
          <p className="px-2 pb-1 pt-1 text-xs font-medium text-muted">Colour theme</p>
          <ul className="flex flex-col gap-0.5">
            {THEMES.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => choose(t.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm ${
                    active === t.id ? "bg-raised text-cream" : "text-muted hover:bg-raised/60"
                  }`}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-md border border-white/15">
                    <span className="h-6 w-4" style={{ background: t.swatch[0] }} />
                    <span className="h-6 w-4" style={{ background: t.swatch[1] }} />
                  </span>
                  <span className="flex-1">{t.name}</span>
                  {active === t.id && <span className="text-brand-light">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
