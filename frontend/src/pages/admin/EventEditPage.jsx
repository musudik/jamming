import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../../api.js";
import { Button, Input, Textarea, Spinner, ErrorBox } from "../../components/ui.jsx";
import BulkImport from "../../components/BulkImport.jsx";

const EMPTY_EVENT = {
  name: "",
  venue: "",
  description: "",
  date: "",
  status: "DRAFT",
};

const EMPTY_SONG = { title: "", artist: "", language: "", genre: "", lyrics: "", lyricsEn: "" };

export default function EventEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [event, setEvent] = useState(EMPTY_EVENT);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const ev = await api.getEvent(id);
        setEvent({
          name: ev.name || "",
          venue: ev.venue || "",
          description: ev.description || "",
          date: ev.date ? ev.date.slice(0, 10) : "",
          status: ev.status || "DRAFT",
        });
        setSongs(ev.songs.map((es) => ({ ...es.song, displayOrder: es.displayOrder })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  async function saveEvent(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: event.name,
        venue: event.venue || null,
        description: event.description || null,
        date: event.date ? new Date(event.date).toISOString() : null,
        status: event.status,
      };
      if (isNew) {
        const created = await api.createEvent(payload);
        navigate(`/admin/events/${created.id}`, { replace: true });
      } else {
        await api.updateEvent(id, payload);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link to="/admin" className="text-sm text-muted hover:text-cream">
        ← Back to events
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">{isNew ? "New event" : "Edit event"}</h1>

      <ErrorBox message={error} />

      <form onSubmit={saveEvent} className="mt-4 flex flex-col gap-4">
        <Input
          label="Event name *"
          value={event.name}
          onChange={(e) => setEvent({ ...event, name: e.target.value })}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Venue"
            value={event.venue}
            onChange={(e) => setEvent({ ...event, venue: e.target.value })}
          />
          <Input
            label="Date"
            type="date"
            value={event.date}
            onChange={(e) => setEvent({ ...event, date: e.target.value })}
          />
        </div>
        <Textarea
          label="Description"
          rows={2}
          value={event.description}
          onChange={(e) => setEvent({ ...event, description: e.target.value })}
        />
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Status</span>
          <select
            className="w-full rounded-lg border border-line bg-surface px-3 py-2"
            value={event.status}
            onChange={(e) => setEvent({ ...event, status: e.target.value })}
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create event" : "Save changes"}
          </Button>
        </div>
      </form>

      {!isNew && (
        <>
          <QRPanel eventId={id} />
          <SongManager
            eventId={id}
            songs={songs}
            setSongs={setSongs}
            onError={setError}
          />
        </>
      )}
    </div>
  );
}

function QRPanel({ eventId }) {
  const canvasWrap = useRef(null);
  const url = `${window.location.origin}/event/${eventId}`;

  function download() {
    const canvas = canvasWrap.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `jamlyrics-event-${eventId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <section className="mt-10 rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-3 text-lg font-semibold">Participant QR code</h2>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div ref={canvasWrap} className="rounded-lg bg-white p-3">
          <QRCodeCanvas value={url} size={160} includeMargin />
        </div>
        <div className="min-w-0">
          <p className="break-all text-sm text-muted">{url}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={download}>
              Download PNG
            </Button>
            <a href={url} target="_blank" rel="noreferrer">
              <Button variant="ghost">Preview</Button>
            </a>
          </div>
          <p className="mt-2 text-xs text-muted">
            Tip: when testing on a phone, the QR uses this machine's address — start the dev
            server with your LAN IP so phones can reach it.
          </p>
        </div>
      </div>
    </section>
  );
}

function SongManager({ eventId, songs, setSongs, onError }) {
  const [draft, setDraft] = useState(EMPTY_SONG);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setDraft(EMPTY_SONG);
    setEditingId(null);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    onError("");
    try {
      const payload = {
        title: draft.title,
        artist: draft.artist || null,
        language: draft.language || null,
        genre: draft.genre || null,
        lyrics: draft.lyrics,
        lyricsEn: draft.lyricsEn || null,
      };
      if (editingId) {
        const updated = await api.updateSong(eventId, editingId, payload);
        setSongs((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...updated } : s)));
      } else {
        const created = await api.addSong(eventId, payload);
        setSongs((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function edit(song) {
    setEditingId(song.id);
    setDraft({
      title: song.title || "",
      artist: song.artist || "",
      language: song.language || "",
      genre: song.genre || "",
      lyrics: song.lyrics || "",
      lyricsEn: song.lyricsEn || "",
    });
  }

  async function remove(songId) {
    if (!confirm("Remove this song?")) return;
    try {
      await api.deleteSong(eventId, songId);
      setSongs((prev) => prev.filter((s) => s.id !== songId));
      if (editingId === songId) resetForm();
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold">Songs ({songs.length})</h2>

      <BulkImport
        eventId={eventId}
        onImported={(created) =>
          setSongs((prev) => [
            ...prev,
            ...created.map((s, i) => ({ ...s, displayOrder: prev.length + i })),
          ])
        }
      />

      <ul className="mb-6 mt-6 flex flex-col gap-2">
        {songs.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-2"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{s.title}</div>
              <div className="text-sm text-muted">
                {[s.artist, s.language, s.genre].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" onClick={() => edit(s)}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => remove(s.id)}>
                Remove
              </Button>
            </div>
          </li>
        ))}
        {songs.length === 0 && (
          <li className="text-sm text-muted">No songs yet — add one below.</li>
        )}
      </ul>

      <form
        onSubmit={submit}
        className="rounded-xl border border-line bg-surface p-5"
      >
        <h3 className="mb-3 font-semibold">{editingId ? "Edit song" : "Add song"}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Title *"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            required
          />
          <Input
            label="Artist"
            value={draft.artist}
            onChange={(e) => setDraft({ ...draft, artist: e.target.value })}
          />
          <Input
            label="Language"
            value={draft.language}
            onChange={(e) => setDraft({ ...draft, language: e.target.value })}
          />
          <Input
            label="Genre"
            value={draft.genre}
            onChange={(e) => setDraft({ ...draft, genre: e.target.value })}
          />
        </div>
        <div className="mt-3">
          <Textarea
            label="Telugu lyrics *"
            rows={6}
            value={draft.lyrics}
            onChange={(e) => setDraft({ ...draft, lyrics: e.target.value })}
            required
          />
        </div>
        <div className="mt-3">
          <Textarea
            label="English lyrics (optional)"
            rows={6}
            value={draft.lyricsEn}
            onChange={(e) => setDraft({ ...draft, lyricsEn: e.target.value })}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : editingId ? "Update song" : "Add song"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
