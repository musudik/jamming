import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api.js";
import { Spinner, ErrorBox } from "../../components/ui.jsx";

// Auto-scroll speeds in pixels per second.
const SPEEDS = {
  Slow: 12,
  Normal: 28,
  Fast: 55,
};

export default function LyricsPage() {
  const { id, songId } = useParams();
  const [song, setSong] = useState(null);
  const [error, setError] = useState("");

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("Slow");
  const [fontScale, setFontScale] = useState(1);

  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const remainderRef = useRef(0); // fractional px carried between frames

  useEffect(() => {
    (async () => {
      try {
        setSong(await api.publicSong(id, songId));
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [id, songId]);

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

      const pxPerSec = SPEEDS[speed];
      const move = pxPerSec * dt + remainderRef.current;
      const whole = Math.floor(move);
      remainderRef.current = move - whole;

      el.scrollTop += whole;

      // Stop when we reach the bottom.
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

  if (error) return <ErrorBox message={error} />;
  if (!song) return <Spinner />;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-line bg-base/95 px-4 py-3 backdrop-blur">
        <Link
          to={`/event/${id}`}
          className="text-sm text-muted hover:text-cream"
        >
          ← Song list
        </Link>
        <h1 className="mt-1 text-xl font-bold leading-tight text-brand-light">{song.title}</h1>
        {song.artist && <p className="text-sm text-muted">{song.artist}</p>}
      </header>

      {/* Lyrics scroll area */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-6 py-8"
        onPointerDown={() => playing && setPlaying(false)} // tap to pause if user grabs scroll
      >
        <pre
          className="whitespace-pre-wrap font-sans leading-relaxed text-cream"
          style={{ fontSize: `${1.25 * fontScale}rem` }}
        >
          {song.lyrics}
        </pre>
        {/* Tail spacing so the last line can scroll to centre */}
        <div className="h-[40vh]" />
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
                  speed === s ? "bg-brand font-semibold text-ink" : "text-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFontScale((f) => Math.max(0.8, f - 0.1))}
              className="h-9 w-9 rounded-lg bg-surface text-muted"
              aria-label="Smaller text"
            >
              A−
            </button>
            <button
              onClick={() => setFontScale((f) => Math.min(2, f + 0.1))}
              className="h-9 w-9 rounded-lg bg-surface text-lg text-muted"
              aria-label="Larger text"
            >
              A+
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex-1 rounded-lg bg-brand py-3 font-semibold text-ink active:bg-brand-light"
          >
            {playing ? "⏸ Pause" : "▶ Auto-scroll"}
          </button>
          <button
            onClick={restart}
            className="rounded-lg bg-raised px-4 py-2.5 font-medium text-cream"
          >
            ⟲ Restart
          </button>
        </div>
      </footer>
    </div>
  );
}
