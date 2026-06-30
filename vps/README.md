# JamLyrics on a VPS (backend + database) + Vercel (frontend)

Runs the whole backend stack on your VPS and lets Vercel host only the static frontend.

```
Browser ──HTTPS──► Vercel (React SPA)
                      │  VITE_API_BASE = https://<API_DOMAIN>
                      ▼
VPS:  Caddy (HTTPS, auto-cert) ─► backend (Express :4000) ─► Postgres ◄─ pgAdmin
```

```
vps/
├── docker-compose.yml        postgres + pgadmin + backend + caddy
├── .env.example              all credentials / settings (copy to .env)
├── init/01-create-schema.sh  creates POSTGRES_SCHEMA on first init
├── pgadmin/servers.json      pre-registers the DB in pgAdmin
└── caddy/Caddyfile           HTTPS reverse proxy → backend
```

## Services

| Service  | Exposure              | Purpose                                        |
|----------|-----------------------|------------------------------------------------|
| caddy    | **80 + 443** (public) | HTTPS entry point; proxies to the backend      |
| backend  | internal only         | Express API (Prisma); migrates + seeds on boot |
| postgres | internal (5432)       | database (host `${POSTGRES_PORT}` optional)    |
| pgadmin  | `${PGADMIN_PORT}` 5050| DB web UI at `http://<VPS_IP>:5050`            |

The backend talks to Postgres over the internal Docker network, so **Postgres does not need
to be exposed publicly** — you can drop the `postgres` `ports:` mapping (and close 5443) for
security if you don't need remote DB access.

## 1. Deploy on the VPS

```bash
cd vps
cp .env.example .env
# Edit .env:
#   POSTGRES_PASSWORD / PGADMIN_DEFAULT_PASSWORD / SEED_ADMIN_PASSWORD  → strong values
#   JWT_SECRET            → a long random string
#   FRONTEND_ORIGIN       → your Vercel URL, e.g. https://jamming-blond.vercel.app
#   API_DOMAIN            → api.<VPS-IP-with-dashes>.sslip.io  (e.g. api.207-180-235-87.sslip.io)

docker compose up -d --build
```

Open the VPS firewall for HTTP/HTTPS (Caddy needs both for the cert challenge):

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5050/tcp     # pgAdmin (optional)
```

Caddy fetches a Let's Encrypt cert for `API_DOMAIN` automatically (sslip.io resolves to your
VPS IP, so no DNS setup is needed). Verify:

```bash
curl https://api.207-180-235-87.sslip.io/api/health      # {"ok":true}
```

## 2. Load the songs

The backend image bundles the loader and song data, so run it inside the container:

```bash
docker exec jamlyrics-backend node scripts/load-songs-db.mjs
```

Creates the **Munich – Tollywood Jamming Night** event with all 30 songs (idempotent).

## 3. Point Vercel at the VPS

In the Vercel **frontend** project → Settings → Environment Variables:

```
VITE_API_BASE = https://api.207-180-235-87.sslip.io
```

Redeploy. `/admin/login` and the participant pages now work against the VPS backend.

> Both must agree: `API_DOMAIN` (VPS) ↔ `VITE_API_BASE` (Vercel), and `FRONTEND_ORIGIN`
> (VPS, for CORS) ↔ your actual Vercel URL.

## Useful commands

```bash
docker compose logs -f backend caddy     # follow API + proxy logs
docker compose logs caddy | grep -i cert # check certificate issuance
docker compose up -d --build backend     # redeploy after pulling new code
docker compose down                       # stop (keeps data)
```

## Security notes
- Strong, unique passwords for Postgres, pgAdmin, and the seed admin; a long random `JWT_SECRET`.
- Prefer **not** exposing Postgres publicly now that the backend connects internally.
- Put pgAdmin behind an IP allow-list / VPN if you don't want it open on 5050.
- Back up the `pgdata` volume.
