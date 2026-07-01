# JamLyrics on a VPS (backend + database) + Vercel (frontend)

Runs the backend stack on your VPS and lets Vercel host only the static frontend.
This VPS already runs a **host nginx** on ports 80/443, so that nginx (not Caddy) is the
HTTPS entry point — it reverse-proxies to the backend container on `127.0.0.1:4000`.

```
Browser ──HTTPS──► Vercel (React SPA)
                      │  VITE_API_BASE = https://<API_DOMAIN>
                      ▼
VPS host nginx (443, TLS via certbot) ─► 127.0.0.1:4000 backend ─► Postgres ◄─ pgAdmin
```

```
vps/
├── docker-compose.yml          postgres + pgadmin + backend
├── .env.example                all credentials / settings (copy to .env)
├── init/01-create-schema.sh    creates POSTGRES_SCHEMA on first init
├── pgadmin/servers.json        pre-registers the DB in pgAdmin
└── nginx/jamlyrics-api.conf     host-nginx vhost → backend (add certbot for TLS)
```

## Services

| Service  | Exposure                | Purpose                                        |
|----------|-------------------------|------------------------------------------------|
| backend  | `127.0.0.1:4000` (local)| Express API (Prisma); migrates + seeds on boot |
| postgres | internal (5432)         | database (host `${POSTGRES_PORT}` optional)    |
| pgadmin  | `${PGADMIN_PORT}` 5050  | DB web UI at `http://<VPS_IP>:5050`            |

HTTPS is handled by the **existing host nginx**, not by this compose. The backend is bound to
`127.0.0.1` so it's only reachable through nginx, never directly from the internet.

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

The backend is now on `127.0.0.1:4000`. Confirm it's healthy locally:

```bash
curl http://127.0.0.1:4000/api/health      # {"ok":true}
```

## 2. Front it with the host nginx + HTTPS

Add a vhost to the nginx already running on this VPS, then let certbot add the cert:

```bash
sudo cp nginx/jamlyrics-api.conf /etc/nginx/sites-available/jamlyrics-api.conf
sudo ln -s /etc/nginx/sites-available/jamlyrics-api.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# get the TLS cert (sslip.io resolves to your VPS IP; nginx already answers on :80)
sudo certbot --nginx -d api.207-180-235-87.sslip.io
```

certbot rewrites the vhost to serve HTTPS on 443 and reload nginx. Verify from anywhere:

```bash
curl https://api.207-180-235-87.sslip.io/api/health      # {"ok":true}
```

> If your nginx uses `conf.d/` instead of `sites-available/`, drop the file in
> `/etc/nginx/conf.d/` instead. Make sure `server_name` matches your `API_DOMAIN`.

## 3. Load the songs

The backend image bundles the loader and song data, so run it inside the container:

```bash
docker exec jamlyrics-backend node scripts/load-songs-db.mjs
```

Creates the **Munich – Tollywood Jamming Night** event with all 30 songs (idempotent).

## 4. Point Vercel at the VPS

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
