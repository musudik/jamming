import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

const eventSchema = z.object({
  name: z.string().min(1),
  date: z.string().datetime().optional().nullable(),
  venue: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

const songSchema = z.object({
  title: z.string().min(1),
  artist: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  genre: z.string().optional().nullable(),
  lyrics: z.string().min(1),
  duration: z.number().int().positive().optional().nullable(),
  displayOrder: z.number().int().optional(),
});

// Ensure the event belongs to the requesting admin.
async function ownEventOr404(eventId, adminId, res) {
  const event = await prisma.event.findFirst({ where: { id: eventId, ownerId: adminId } });
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return null;
  }
  return event;
}

// --- Events ---

eventsRouter.get("/", async (req, res) => {
  const events = await prisma.event.findMany({
    where: { ownerId: req.admin.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { songs: true } } },
  });
  res.json(events);
});

eventsRouter.get("/:id", async (req, res) => {
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, ownerId: req.admin.id },
    include: {
      songs: {
        orderBy: { displayOrder: "asc" },
        include: { song: true },
      },
    },
  });
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json(event);
});

eventsRouter.post("/", async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const { date, ...rest } = parsed.data;
  const event = await prisma.event.create({
    data: { ...rest, date: date ? new Date(date) : null, ownerId: req.admin.id },
  });
  res.status(201).json(event);
});

eventsRouter.put("/:id", async (req, res) => {
  if (!(await ownEventOr404(req.params.id, req.admin.id, res))) return;
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const { date, ...rest } = parsed.data;
  const event = await prisma.event.update({
    where: { id: req.params.id },
    data: { ...rest, ...(date !== undefined ? { date: date ? new Date(date) : null } : {}) },
  });
  res.json(event);
});

eventsRouter.delete("/:id", async (req, res) => {
  if (!(await ownEventOr404(req.params.id, req.admin.id, res))) return;
  await prisma.event.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// --- Songs within an event ---
// Creating a song also links it to the event via EventSong.

eventsRouter.post("/:id/songs", async (req, res) => {
  if (!(await ownEventOr404(req.params.id, req.admin.id, res))) return;
  const parsed = songSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const { displayOrder, ...songData } = parsed.data;

  // Default displayOrder to end of list.
  let order = displayOrder;
  if (order === undefined) {
    const max = await prisma.eventSong.aggregate({
      where: { eventId: req.params.id },
      _max: { displayOrder: true },
    });
    order = (max._max.displayOrder ?? -1) + 1;
  }

  const song = await prisma.song.create({ data: songData });
  await prisma.eventSong.create({
    data: { eventId: req.params.id, songId: song.id, displayOrder: order },
  });
  res.status(201).json({ ...song, displayOrder: order });
});

// Bulk add songs (from Excel / Google Sheet / JSON imports).
// The client normalizes its source into an array of song objects before posting.
const bulkSchema = z.object({
  songs: z.array(songSchema.omit({ displayOrder: true })).min(1).max(1000),
});

eventsRouter.post("/:id/songs/bulk", async (req, res) => {
  if (!(await ownEventOr404(req.params.id, req.admin.id, res))) return;
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const max = await prisma.eventSong.aggregate({
    where: { eventId: req.params.id },
    _max: { displayOrder: true },
  });
  let order = (max._max.displayOrder ?? -1) + 1;

  // Insert all songs and their event links in one transaction.
  const created = await prisma.$transaction(
    parsed.data.songs.map((s) =>
      prisma.song.create({
        data: { ...s, events: { create: { eventId: req.params.id, displayOrder: order++ } } },
      })
    )
  );

  res.status(201).json({ imported: created.length, songs: created });
});

// Proxy a public Google Sheet as CSV (avoids browser CORS on docs.google.com).
// Accepts a normal share URL or a direct CSV export URL.
eventsRouter.post("/:id/songs/gsheet-csv", async (req, res) => {
  if (!(await ownEventOr404(req.params.id, req.admin.id, res))) return;
  const url = String(req.body?.url || "").trim();
  if (!url) return res.status(400).json({ error: "Missing url" });

  const csvUrl = toGoogleSheetCsvUrl(url);
  if (!csvUrl) {
    return res.status(400).json({ error: "Not a recognized Google Sheets URL" });
  }

  try {
    const r = await fetch(csvUrl, { redirect: "follow" });
    if (!r.ok) {
      return res.status(400).json({
        error: `Could not fetch sheet (${r.status}). Make sure it's shared as "Anyone with the link".`,
      });
    }
    const csv = await r.text();
    // A private sheet returns an HTML sign-in page instead of CSV.
    if (csv.trimStart().toLowerCase().startsWith("<!doctype html")) {
      return res.status(400).json({
        error: 'Sheet is not public. Share it as "Anyone with the link can view".',
      });
    }
    res.json({ csv });
  } catch {
    res.status(502).json({ error: "Failed to reach Google Sheets" });
  }
});

function toGoogleSheetCsvUrl(url) {
  // Already a CSV export / published-CSV link.
  if (/[?&]output=csv/.test(url) || /[?&]format=csv/.test(url)) return url;
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const id = m[1];
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

eventsRouter.put("/:id/songs/:songId", async (req, res) => {
  if (!(await ownEventOr404(req.params.id, req.admin.id, res))) return;
  const link = await prisma.eventSong.findUnique({
    where: { eventId_songId: { eventId: req.params.id, songId: req.params.songId } },
  });
  if (!link) return res.status(404).json({ error: "Song not found in event" });

  const parsed = songSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const { displayOrder, ...songData } = parsed.data;

  const song = await prisma.song.update({ where: { id: req.params.songId }, data: songData });
  if (displayOrder !== undefined) {
    await prisma.eventSong.update({
      where: { eventId_songId: { eventId: req.params.id, songId: req.params.songId } },
      data: { displayOrder },
    });
  }
  res.json({ ...song, displayOrder: displayOrder ?? link.displayOrder });
});

eventsRouter.delete("/:id/songs/:songId", async (req, res) => {
  if (!(await ownEventOr404(req.params.id, req.admin.id, res))) return;
  await prisma.eventSong.delete({
    where: { eventId_songId: { eventId: req.params.id, songId: req.params.songId } },
  });
  // Remove the orphaned song row too (MVP: songs aren't shared across events in the UI).
  await prisma.song.delete({ where: { id: req.params.songId } }).catch(() => {});
  res.status(204).end();
});
