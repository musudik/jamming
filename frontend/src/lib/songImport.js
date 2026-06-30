// xlsx is large and only needed in the admin bulk-import flow, so it is
// dynamically imported (code-split) rather than bundled into the main app.
let _xlsx = null;
async function getXLSX() {
  if (!_xlsx) _xlsx = await import("xlsx");
  return _xlsx;
}

// Map many possible spreadsheet header names to our canonical song fields.
const HEADER_ALIASES = {
  title: ["title", "song", "songtitle", "song title", "name", "track"],
  artist: ["artist", "singer", "artists", "by", "composer"],
  language: ["language", "lang"],
  genre: ["genre", "category", "type"],
  lyrics: ["lyrics", "lyric", "text", "words"],
  duration: ["duration", "length", "seconds", "secs"],
};

function buildHeaderLookup() {
  const lookup = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const a of aliases) lookup[a] = field;
  }
  return lookup;
}
const HEADER_LOOKUP = buildHeaderLookup();

function canonKey(key) {
  return String(key).trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

// Turn an arbitrary row object into a normalized song (unknown columns ignored).
function normalizeRow(row) {
  const out = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const field = HEADER_LOOKUP[canonKey(rawKey)];
    if (!field) continue;
    if (value === null || value === undefined) continue;
    out[field] = typeof value === "string" ? value.trim() : value;
  }

  const song = {
    title: out.title ? String(out.title) : "",
    artist: out.artist ? String(out.artist) : null,
    language: out.language ? String(out.language) : null,
    genre: out.genre ? String(out.genre) : null,
    lyrics: out.lyrics ? String(out.lyrics) : "",
  };
  if (out.duration !== undefined && out.duration !== "") {
    const n = parseInt(out.duration, 10);
    if (!Number.isNaN(n) && n > 0) song.duration = n;
  }
  return song;
}

// Validate + tag each song so the preview can flag problems.
export function normalizeRows(rawRows) {
  return rawRows
    .map((r) => normalizeRow(r))
    .map((song) => {
      const problems = [];
      if (!song.title) problems.push("missing title");
      if (!song.lyrics) problems.push("missing lyrics");
      return { song, problems, valid: problems.length === 0 };
    })
    // Drop fully-empty rows (common trailing rows in spreadsheets).
    .filter((r) => r.song.title || r.song.lyrics || r.song.artist);
}

// --- Source parsers (all return an array of raw row objects) ---

export async function rowsFromWorkbookArrayBuffer(arrayBuffer) {
  const XLSX = await getXLSX();
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

export async function rowsFromCsv(text) {
  const XLSX = await getXLSX();
  const wb = XLSX.read(text, { type: "string" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

export function rowsFromJson(text) {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : Array.isArray(data.songs) ? data.songs : null;
  if (!arr) throw new Error("JSON must be an array of songs, or { songs: [...] }.");
  return arr;
}

// A ready-to-fill CSV template for admins.
export function templateCsv() {
  return [
    "title,artist,language,genre,lyrics,duration",
    '"Wonderwall","Oasis","English","Rock","Today is gonna be the day...",260',
  ].join("\n");
}
