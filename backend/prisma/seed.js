import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const EVENT_NAME = process.env.EVENT_NAME || "Munich – Tollywood Jamming Night";

// Master song data lives in scripts/data/songs.json (Telugu + English per song).
const SONGS_PATH = path.join(__dirname, "..", "scripts", "data", "songs.json");

// Supports the bilingual format ({ telugu, english }) and the old one ({ lines }).
function lyricsOf(s) {
  const te = s.telugu || s.lines || [];
  const en = s.english || [];
  return { lyrics: te.join("\n"), lyricsEn: en.length ? en.join("\n") : null };
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@jamlyrics.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: "Default Admin" },
  });
  console.log(`Admin ready: ${email} / ${password}`);

  const songs = JSON.parse(fs.readFileSync(SONGS_PATH, "utf-8"));

  // Find-or-create the event, then refresh its songs from songs.json (idempotent).
  let event = await prisma.event.findFirst({
    where: { name: EVENT_NAME, ownerId: admin.id },
  });
  if (event) {
    await prisma.eventSong.deleteMany({ where: { eventId: event.id } });
    await prisma.song.deleteMany({ where: { events: { none: {} } } }); // drop orphaned songs
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
  }

  let order = 0;
  for (const s of songs) {
    const { lyrics, lyricsEn } = lyricsOf(s);
    const song = await prisma.song.create({
      data: { title: s.title, artist: s.artist ?? null, language: "Telugu", lyrics, lyricsEn },
    });
    await prisma.eventSong.create({
      data: { eventId: event.id, songId: song.id, displayOrder: order++ },
    });
  }

  console.log(`Seeded ${songs.length} songs into "${EVENT_NAME}" (${event.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
