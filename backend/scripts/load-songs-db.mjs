// Load the Munich Tollywood songs DIRECTLY into the database via Prisma.
// Use this when you have a standalone Postgres (e.g. on a VPS) and no running backend.
//
// Steps:
//   cd backend
//   # point DATABASE_URL at the target DB (note the schema):
//   #   PowerShell:  $env:DATABASE_URL="postgresql://jamlyrics:PASS@207.180.235.87:5443/jamlyrics?schema=jamlyrics"
//   npx prisma migrate deploy        # creates the tables in that schema
//   node scripts/load-songs-db.mjs   # inserts the songs
//
// Idempotent: re-running clears this event's songs and reloads them.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const EVENT_NAME = process.env.EVENT_NAME || "Munich – Tollywood Jamming Night";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@jamlyrics.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";

const SONGS_FILE = process.env.SONGS_FILE || "songs.json";
const songs = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", SONGS_FILE), "utf-8")
);

// Supports both the bilingual format ({ telugu, english }) and the old one ({ lines }).
function lyricsOf(s) {
  const te = s.telugu || s.lines || [];
  const en = s.english || [];
  return {
    lyrics: te.join("\n"),
    lyricsEn: en.length ? en.join("\n") : null,
  };
}

async function main() {
  // 1. Ensure an admin exists to own the event.
  const admin = await prisma.admin.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      name: "Default Admin",
    },
  });

  // 2. Find-or-create the event, clearing its songs for a clean reload.
  let event = await prisma.event.findFirst({
    where: { name: EVENT_NAME, ownerId: admin.id },
  });
  if (event) {
    const { count } = await prisma.eventSong.deleteMany({ where: { eventId: event.id } });
    // remove now-orphaned songs that belonged only to this event
    await prisma.song.deleteMany({
      where: { events: { none: {} } },
    });
    console.log(`Reusing event ${event.id} (cleared ${count} songs)`);
  } else {
    event = await prisma.event.create({
      data: {
        name: EVENT_NAME,
        venue: "Borschtallee 26, 80804 München",
        date: new Date("2026-07-04T18:30:00.000Z"),
        description:
          "Munich's first Telugu Jamming Night — bring your voice, bring your instruments.",
        status: "PUBLISHED",
        ownerId: admin.id,
      },
    });
    console.log(`Created event ${event.id}`);
  }

  // 3. Insert each song + its event link, ordered by the file order (already by number).
  let order = 0;
  for (const s of songs) {
    const { lyrics, lyricsEn } = lyricsOf(s);
    const song = await prisma.song.create({
      data: {
        title: s.title,
        artist: null,
        language: "Telugu",
        lyrics,
        lyricsEn,
      },
    });
    await prisma.eventSong.create({
      data: { eventId: event.id, songId: song.id, displayOrder: order++ },
    });
  }

  console.log(`Imported ${songs.length} songs into "${EVENT_NAME}"`);
  console.log(`Event ID: ${event.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
