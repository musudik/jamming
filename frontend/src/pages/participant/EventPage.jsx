import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api.js";
import { Spinner, ErrorBox, Logo } from "../../components/ui.jsx";
import ThemePicker from "../../components/ThemePicker.jsx";

export default function EventPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setEvent(await api.publicEvent(id));
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [id]);

  const languages = useMemo(() => {
    if (!event) return [];
    return [...new Set(event.songs.map((s) => s.language).filter(Boolean))].sort();
  }, [event]);

  const filtered = useMemo(() => {
    if (!event) return [];
    const q = query.trim().toLowerCase();
    return event.songs.filter((s) => {
      const matchesQ =
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.artist || "").toLowerCase().includes(q);
      const matchesLang = !language || s.language === language;
      return matchesQ && matchesLang;
    });
  }, [event, query, language]);

  if (error) return <ErrorBox message={error} />;
  if (!event) return <Spinner />;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-2 flex justify-end">
        <ThemePicker />
      </div>
      <Logo className="mb-5 h-20" />
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-brand-light">{event.name}</h1>
        <p className="text-sm text-muted">
          {[event.venue, event.date ? new Date(event.date).toLocaleDateString() : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {event.description && (
          <p className="mt-1 text-sm text-muted">{event.description}</p>
        )}
      </header>

      <div className="mb-4 flex flex-col gap-2">
        <input
          placeholder="Search songs or artists…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
        />
        {languages.length > 0 && (
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2"
          >
            <option value="">All languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.map((s) => (
          <li key={s.id}>
            <Link
              to={`/event/${id}/song/${s.id}`}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 active:bg-raised"
            >
              <span className="w-7 shrink-0 text-right font-semibold tabular-nums text-brand-light">
                {s.displayOrder + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{s.title}</span>
                <span className="block text-sm text-muted">
                  {[s.artist, s.language].filter(Boolean).join(" · ") || "—"}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-8 text-center text-muted">No songs match your search.</li>
        )}
      </ul>
    </div>
  );
}
