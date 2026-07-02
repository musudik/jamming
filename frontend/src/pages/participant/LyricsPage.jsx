import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api.js";
import { Spinner, ErrorBox } from "../../components/ui.jsx";
import ThemePicker from "../../components/ThemePicker.jsx";

// Auto-scroll speeds in pixels per second.
const SPEEDS = { Slow: 12, Normal: 28, Fast: 55 };

const store = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : v;
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

// Keep the screen awake while `active` (so the phone doesn't lock mid-song).
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* denied or unsupported — ignore */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (lock) lock.release().catch(() => {});
    };
  }, [active]);
}

export default function LyricsPage() {
  const { id, songId } = useParams();
  const navigate = useNavigate();

  const [song, setSong] = useState(null);
  const [songList, setSongList] = useState([]); // ordered ids for prev/next
  const [error, setError] = useState("");

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(() => store.get("jam_speed", "Slow"));
  const [fontScale, setFontScale] = useState(() => Number(store.get("jam_font", "1")) || 1);
  const [lang, setLang] = useState(() => {
    const v = store.get("jam_lang", "te");
    return v === "en" ? "en" : "te"; // te | en (legacy "both" -> te)
  });

  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const remainderRef = useRef(0);

  useWakeLock(true); // stay awake the whole time the reader is open

  // persist preferences
  useEffect(() => store.set("jam_speed", speed), [speed]);
  useEffect(() => store.set("jam_font", String(fontScale)), [fontScale]);
  useEffect(() => store.set("jam_lang", lang), [lang]);

  // Load the song (and reset view) whenever the song changes.
  useEffect(() => {
    let alive = true;
    setSong(null);
    setPlaying(false);
    (async () => {
      try {
        const s = await api.publicSong(id, songId);
        if (alive) setSong(s);
      } catch (err) {
        if (alive) setError(err.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, songId]);

  // Load the ordered song list once (for prev/next navigation).
  useEffect(() => {
    (async () => {
      try {
        const ev = await api.publicEvent(id);
        setSongList(ev.songs.map((s) => s.id));
      } catch {
        /* prev/next just won't show */
      }
    })();
  }, [id]);

  // Auto-scroll loop.
  useEffect(() => {
    if (!playing) return;
    const el = scrollRef.current;
    if (!el) return;
    lastTsRef.current = 0;
    function step(ts) {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      const move = SPEEDS[speed] * dt + remainderRef.current;
      const whole = Math.floor(move);
      remainderRef.current = move - whole;
      el.scrollTop += whole;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      remainderRef.current = 0;
    };
  }, [playing, speed]);

  function restart() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setPlaying(true);
  }

  // Reset scroll + pause on language change.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setPlaying(false);
  }, [lang, songId]);

  if (error) return <ErrorBox message={error} />;
  if (!song) return <Spinner />;

  const hasEn = Boolean(song.lyricsEn && song.lyricsEn.trim());
  const effLang = lang !== "te" && !hasEn ? "te" : lang;

  const teLines = (song.lyrics || "").split("\n");
  const enLines = (song.lyricsEn || "").split("\n");

  // prev / next within the event's ordered list
  const idx = songList.indexOf(songId);
  const prevId = idx > 0 ? songList[idx - 1] : null;
  const nextId = idx >= 0 && idx < songList.length - 1 ? songList[idx + 1] : null;
  const goto = (sid) => sid && navigate(`/event/${id}/song/${sid}`);

  const LANGS = [
    { key: "te", label: "తెలుగు" },
    { key: "en", label: "English" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-line bg-base/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link to={`/event/${id}`} className="text-sm text-muted hover:text-cream">
            ← Song list
          </Link>
          <ThemePicker />
        </div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight text-brand-light">
              {song.displayOrder != null && (
                <span className="tabular-nums">{song.displayOrder + 1}. </span>
              )}
              {song.title}
            </h1>
            {song.artist && <p className="text-sm text-muted">{song.artist}</p>}
          </div>
          {hasEn && (
            <div className="flex shrink-0 gap-1 rounded-lg bg-surface p-1">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLang(l.key)}
                  className={`rounded-md px-2.5 py-1 text-sm ${
                    effLang === l.key ? "bg-brand font-semibold text-onbrand" : "text-muted"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Lyrics scroll area */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-6 py-8 leading-relaxed"
        onPointerDown={() => playing && setPlaying(false)}
        style={{ fontSize: `${1.25 * fontScale}rem` }}
      >
        <SingleLyrics lines={effLang === "en" ? enLines : teLines} />
        <div className="h-[45vh]" />
      </div>

      {/* Controls */}
      <footer className="shrink-0 border-t border-line bg-base/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-surface p-1">
            {Object.keys(SPEEDS).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`rounded-md px-3 py-1 text-sm ${
                  speed === s ? "bg-brand font-semibold text-onbrand" : "text-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFontScale((f) => Math.max(0.8, +(f - 0.1).toFixed(2)))}
              className="h-9 w-9 rounded-lg bg-surface text-muted"
              aria-label="Smaller text"
            >
              A−
            </button>
            <button
              onClick={() => setFontScale((f) => Math.min(2.2, +(f + 0.1).toFixed(2)))}
              className="h-9 w-9 rounded-lg bg-surface text-lg text-muted"
              aria-label="Larger text"
            >
              A+
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-stretch gap-2">
          <button
            onClick={() => goto(prevId)}
            disabled={!prevId}
            className="rounded-lg bg-raised px-3 font-medium text-cream disabled:opacity-40"
            aria-label="Previous song"
          >
            ◂
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex-1 rounded-lg bg-brand py-3 font-semibold text-onbrand active:bg-brand-light"
          >
            {playing ? "⏸ Pause" : "▶ Auto-scroll"}
          </button>
          <button
            onClick={restart}
            className="rounded-lg bg-raised px-3 font-medium text-cream"
            aria-label="Restart from top"
          >
            ⟲
          </button>
          <button
            onClick={() => goto(nextId)}
            disabled={!nextId}
            className="rounded-lg bg-raised px-3 font-medium text-cream disabled:opacity-40"
            aria-label="Next song"
          >
            ▸
          </button>
        </div>
      </footer>
    </div>
  );
}

function SingleLyrics({ lines }) {
  return (
    <div className="font-sans text-cream">
      {lines.map((l, i) =>
        l.trim() ? <div key={i}>{l}</div> : <div key={i} className="h-[0.6em]" />
      )}
    </div>
  );
}
