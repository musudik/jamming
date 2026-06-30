import { useRef, useState } from "react";
import { api } from "../api.js";
import { Button } from "./ui.jsx";
import {
  normalizeRows,
  rowsFromWorkbookArrayBuffer,
  rowsFromCsv,
  rowsFromJson,
  templateCsv,
} from "../lib/songImport.js";

const SOURCES = [
  { key: "file", label: "File" },
  { key: "gsheet", label: "Google Sheet" },
  { key: "json", label: "Paste JSON" },
];

export default function BulkImport({ eventId, onImported }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("file");
  const [rows, setRows] = useState([]); // [{song, problems, valid}]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [gsheetUrl, setGsheetUrl] = useState("");
  const [jsonText, setJsonText] = useState("");
  const fileRef = useRef(null);

  function reset() {
    setRows([]);
    setError("");
    setInfo("");
  }

  function loadRows(rawRows) {
    const normalized = normalizeRows(rawRows);
    setRows(normalized);
    if (normalized.length === 0) {
      setError("No songs found. Check that your sheet has title and lyrics columns.");
    }
  }

  async function onFile(e) {
    reset();
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".json")) {
        loadRows(rowsFromJson(await file.text()));
      } else if (name.endsWith(".csv")) {
        loadRows(await rowsFromCsv(await file.text()));
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        loadRows(await rowsFromWorkbookArrayBuffer(await file.arrayBuffer()));
      } else {
        setError("Unsupported file. Use .xlsx, .csv, or .json.");
      }
    } catch (err) {
      setError(err.message || "Could not read that file.");
    }
  }

  async function onLoadGsheet() {
    reset();
    setBusy(true);
    try {
      const { csv } = await api.fetchGoogleSheetCsv(eventId, gsheetUrl);
      loadRows(await rowsFromCsv(csv));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function onLoadJson() {
    reset();
    try {
      loadRows(rowsFromJson(jsonText));
    } catch (err) {
      setError(err.message || "Invalid JSON.");
    }
  }

  async function doImport() {
    const valid = rows.filter((r) => r.valid).map((r) => r.song);
    if (valid.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.bulkAddSongs(eventId, valid);
      onImported?.(result.songs);
      setInfo(`Imported ${result.imported} songs.`);
      setRows([]);
      setGsheetUrl("");
      setJsonText("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([templateCsv()], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "jamlyrics-song-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  if (!open) {
    return (
      <div className="mt-6">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          ⬆ Bulk import songs
        </Button>
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Bulk import songs</h3>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-sm text-muted hover:text-cream"
        >
          Close
        </button>
      </div>

      {/* Source tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-base p-1">
        {SOURCES.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setSource(s.key);
              reset();
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm ${
              source === s.key ? "bg-brand font-semibold text-ink" : "text-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {source === "file" && (
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.json"
            onChange={onFile}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-4 file:py-2 file:text-sm file:text-cream hover:file:bg-line"
          />
          <button onClick={downloadTemplate} className="text-xs text-brand-light underline">
            Download CSV template
          </button>
        </div>
      )}

      {source === "gsheet" && (
        <div className="space-y-2">
          <input
            value={gsheetUrl}
            onChange={(e) => setGsheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            className="min-h-[44px] w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-cream placeholder:text-muted/60 outline-none focus:border-brand"
          />
          <p className="text-xs text-muted">
            Share the sheet as “Anyone with the link can view”, then paste its URL.
          </p>
          <Button variant="secondary" onClick={onLoadGsheet} disabled={busy || !gsheetUrl}>
            {busy ? "Loading…" : "Load sheet"}
          </Button>
        </div>
      )}

      {source === "json" && (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={6}
            placeholder='[{"title":"Wonderwall","artist":"Oasis","lyrics":"..."}]'
            className="w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 font-mono text-sm text-cream placeholder:text-muted/60 outline-none focus:border-brand"
          />
          <Button variant="secondary" onClick={onLoadJson} disabled={!jsonText.trim()}>
            Parse JSON
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {info && (
        <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {info}
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted">
              {validCount} ready{invalidCount > 0 && `, ${invalidCount} with problems`}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-base text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Artist</th>
                  <th className="px-3 py-2 font-medium">Lang</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-line/60">
                    <td className="px-3 py-2">{r.song.title || <em className="text-muted">—</em>}</td>
                    <td className="px-3 py-2 text-muted">{r.song.artist || "—"}</td>
                    <td className="px-3 py-2 text-muted">{r.song.language || "—"}</td>
                    <td className="px-3 py-2">
                      {r.valid ? (
                        <span className="text-emerald-300">✓ ready</span>
                      ) : (
                        <span className="text-amber-300">⚠ {r.problems.join(", ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Button onClick={doImport} disabled={busy || validCount === 0}>
              {busy ? "Importing…" : `Import ${validCount} song${validCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
