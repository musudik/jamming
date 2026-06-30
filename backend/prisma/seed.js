import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@jamlyrics.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "Default Admin" },
  });
  console.log(`Admin ready: ${email} / ${password}`);

  // Sample event + songs so the participant flow works out of the box.
  const existing = await prisma.event.findFirst({ where: { ownerId: admin.id } });
  if (existing) {
    console.log("Sample event already exists, skipping.");
    return;
  }

  const event = await prisma.event.create({
    data: {
      name: "Friday Night Jam",
      venue: "The Garage",
      description: "Open mic acoustic session.",
      status: "PUBLISHED",
      ownerId: admin.id,
    },
  });

  const songs = [
    {
      title: "Wonderwall",
      artist: "Oasis",
      language: "English",
      genre: "Rock",
      lyrics:
        "Today is gonna be the day\nThat they're gonna throw it back to you\nBy now you should've somehow\nRealized what you gotta do\n\nI don't believe that anybody\nFeels the way I do about you now\n\nAnd all the roads we have to walk are winding\nAnd all the lights that lead us there are blinding\n\nBecause maybe\nYou're gonna be the one that saves me\nAnd after all\nYou're my wonderwall",
    },
    {
      title: "Knockin' on Heaven's Door",
      artist: "Bob Dylan",
      language: "English",
      genre: "Folk",
      lyrics:
        "Mama, take this badge off of me\nI can't use it anymore\nIt's getting dark, too dark to see\nFeels like I'm knockin' on heaven's door\n\nKnock, knock, knockin' on heaven's door\nKnock, knock, knockin' on heaven's door",
    },
  ];

  let order = 0;
  for (const s of songs) {
    const song = await prisma.song.create({ data: s });
    await prisma.eventSong.create({
      data: { eventId: event.id, songId: song.id, displayOrder: order++ },
    });
  }

  console.log(`Sample event created: ${event.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
