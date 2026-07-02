// Load the Munich Telugu songs into a JamLyrics deployment via its API.
//
// Usage (PowerShell):
//   $env:API_BASE="https://your-backend.onrender.com"; `
//   $env:ADMIN_EMAIL="admin@jamlyrics.local"; $env:ADMIN_PASSWORD="yourpassword"; `
//   node backend/scripts/load-songs.mjs
//
// Defaults to the local stack (http://localhost:4000 / seed admin) when env vars are unset.
// Idempotent: re-running clears this event's songs and reloads them.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.API_BASE || "http://localhost:4000";
const EMAIL = process.env.ADMIN_EMAIL || "admin@jamlyrics.local";
const PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const EVENT_NAME = process.env.EVENT_NAME || "Munich – Telugu Jamming Night";

const songs = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "munich-songs.json"), "utf-8")
);

async function j(p, opts = {}) {
  const res = await fetch(API + p, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`${p} -> ${res.status}: ${String(text).slice(0, 300)}`);
  return data;
}

const { token } = await j("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const events = await j("/api/events", { headers: auth });
let event = events.find((e) => e.name === EVENT_NAME);
if (event) {
  const full = await j(`/api/events/${event.id}`, { headers: auth });
  for (const es of full.songs) {
    await j(`/api/events/${event.id}/songs/${es.song.id}`, { method: "DELETE", headers: auth });
  }
  console.log(`Reusing event ${event.id} (cleared ${full.songs.length} songs)`);
} else {
  event = await j("/api/events", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: EVENT_NAME,
      venue: "Borschtallee 26, 80804 München",
      date: "2026-07-04T18:30:00.000Z",
      description: "Munich's first Telugu Jamming Night — bring your voice, bring your instruments.",
      status: "PUBLISHED",
    }),
  });
  console.log(`Created event ${event.id}`);
}

const payload = songs.map((s) => ({
  title: `${s.num}. ${s.title}`,
  artist: null,
  language: "Telugu",
  lyrics: s.lines.join("\n"),
}));

const result = await j(`/api/events/${event.id}/songs/bulk`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ songs: payload }),
});

console.log(`Imported ${result.imported} songs into "${EVENT_NAME}"`);
console.log(`Event ID: ${event.id}`);
