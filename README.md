# JamLyrics

Mobile-friendly digital lyric reader for jamming events. Participants scan a QR code,
browse the event's song list, open lyrics, and sing along with slow auto-scroll.

Built from `JamLyrics_Basic_PRD.pdf`.

## Stack

| Layer     | Tech                                      |
|-----------|-------------------------------------------|
| Frontend  | React + Vite + Tailwind (mobile-first PWA)|
| Backend   | Node.js + Express + Prisma                |
| Database  | PostgreSQL (Docker Compose)               |
| Auth      | JWT (admin login)                         |
| QR        | `qrcode` (generated client-side)          |

## Project layout

```
Jamming/
  backend/            Express + Prisma API (+ Dockerfile)
  frontend/           Vite React app (+ Dockerfile, nginx.conf)
  docker-compose.yml  Full stack: db + backend + frontend
```

## Quick start

### Option A — run the whole app with Docker (recommended)

```bash
docker compose up -d --build
```

This builds and runs all three services:

| Service  | Container          | URL                         |
|----------|--------------------|-----------------------------|
| frontend | jamlyrics-frontend | http://localhost:8080 ← app |
| backend  | jamlyrics-backend  | http://localhost:4000/api   |
| db       | jamlyrics-db       | localhost:5434 (Postgres)   |

Open **http://localhost:8080**. The frontend (nginx) serves the built SPA and
reverse-proxies `/api/*` to the backend, so everything is one origin (no CORS).
The backend auto-applies migrations and seeds a default admin on boot. Postgres
data persists in the `jamlyrics_pgdata` volume across restarts.

Default admin: `admin@jamlyrics.local` / `admin123` — **change `JWT_SECRET` and
the seed admin password in `docker-compose.yml` before any real deployment.**

```bash
docker compose logs -f backend   # follow API logs
docker compose down              # stop (keeps data)
docker compose down -v           # stop and wipe the database volume
```

### Option B — local dev (hot reload)

**1. Database**

```bash
docker compose up -d db          # just Postgres on localhost:5434
```

**2. Backend**

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init   # creates tables
npm run seed                         # creates a default admin + sample data
npm run dev                          # http://localhost:4000
```

**3. Frontend**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                          # http://localhost:5173
```

## MVP scope (PRD §8)

- Admin login
- Create event
- Generate QR code
- Add songs + upload lyrics
- Participant song selection
- Lyrics reader with slow auto-scroll

## Bulk importing songs

In the event editor, **Bulk import songs** accepts three sources:

- **File** — `.xlsx`, `.csv`, or `.json` (parsed in-browser; `xlsx` is code-split so it
  only loads for admins, never for participants).
- **Google Sheet** — paste the sheet URL. It must be shared as *"Anyone with the link can
  view"*. The backend fetches it as CSV (avoids browser CORS).
- **Paste JSON** — an array of song objects, or `{ "songs": [...] }`.

Column headers are matched case-insensitively with common aliases:

| Field    | Accepted headers                                    | Required |
|----------|-----------------------------------------------------|----------|
| title    | title, song, song title, name, track                | yes      |
| lyrics   | lyrics, lyric, text, words                           | yes      |
| artist   | artist, singer, by, composer                        | no       |
| language | language, lang                                       | no       |
| genre    | genre, category, type                                | no       |
| duration | duration, length, seconds (whole seconds)            | no       |

Every parsed row is previewed and validated first — rows missing a title or lyrics are
flagged and excluded; only valid rows are imported. A CSV template is downloadable from the
File tab.

## API overview

| Method | Route                                   | Auth  | Purpose                        |
|--------|-----------------------------------------|-------|--------------------------------|
| POST   | `/api/auth/login`                       | —     | Admin login → JWT              |
| GET    | `/api/events`                           | admin | List my events                 |
| POST   | `/api/events`                           | admin | Create event                   |
| PUT    | `/api/events/:id`                       | admin | Update event                   |
| DELETE | `/api/events/:id`                       | admin | Delete event                   |
| POST   | `/api/events/:id/songs`                 | admin | Add song to event              |
| POST   | `/api/events/:id/songs/bulk`            | admin | Bulk add songs (import)        |
| POST   | `/api/events/:id/songs/gsheet-csv`      | admin | Proxy a public Google Sheet→CSV|
| PUT    | `/api/events/:id/songs/:songId`         | admin | Update song                    |
| DELETE | `/api/events/:id/songs/:songId`         | admin | Remove song                    |
| GET    | `/api/public/events/:id`                | —     | Participant: event + song list |
| GET    | `/api/public/events/:id/songs/:songId`  | —     | Participant: single song lyrics|
