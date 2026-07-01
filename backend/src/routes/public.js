import { Router } from "express";
import { prisma } from "../prisma.js";

// Public, unauthenticated routes used by participants who scan the QR code.
export const publicRouter = Router();

// Event + ordered song list (lyrics omitted from the list payload to keep it light).
publicRouter.get("/events/:id", async (req, res) => {
  const event = await prisma.event.findFirst({
    where: { id: req.params.id, status: { in: ["PUBLISHED", "DRAFT"] } },
    include: {
      songs: {
        orderBy: { displayOrder: "asc" },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              artist: true,
              language: true,
              genre: true,
              duration: true,
            },
          },
        },
      },
    },
  });
  if (!event) return res.status(404).json({ error: "Event not found" });

  res.json({
    id: event.id,
    name: event.name,
    date: event.date,
    venue: event.venue,
    description: event.description,
    coverImage: event.coverImage,
    songs: event.songs.map((es) => ({ ...es.song, displayOrder: es.displayOrder })),
  });
});

// Full lyrics for a single song within an event.
publicRouter.get("/events/:id/songs/:songId", async (req, res) => {
  const link = await prisma.eventSong.findUnique({
    where: { eventId_songId: { eventId: req.params.id, songId: req.params.songId } },
    include: { song: true },
  });
  if (!link) return res.status(404).json({ error: "Song not found" });
  res.json({ ...link.song, displayOrder: link.displayOrder });
});
