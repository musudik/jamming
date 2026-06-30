# JamLyrics database on a VPS

Self-contained **PostgreSQL + pgAdmin** stack to run the JamLyrics database on your own
server, with the app schema created automatically and credentials kept in `.env`.

```
vps/
├── docker-compose.yml      Postgres + pgAdmin
├── .env.example            credentials template (copy to .env)
├── init/01-create-schema.sh  creates the POSTGRES_SCHEMA on first init
└── pgadmin/servers.json    pre-registers the Postgres server in pgAdmin
```

## 1. Run it on the VPS

```bash
cd vps
cp .env.example .env        # then edit: set strong POSTGRES_PASSWORD + PGADMIN_DEFAULT_PASSWORD
docker compose up -d
```

This starts:

| Service  | Port (host)        | Purpose                          |
|----------|--------------------|----------------------------------|
| postgres | `${POSTGRES_PORT}` (5432) | the database the app connects to |
| pgadmin  | `${PGADMIN_PORT}` (5050)  | web UI at `http://<VPS_IP>:5050` |

On first start, `init/01-create-schema.sh` creates the schema named by `POSTGRES_SCHEMA`
(default `jamlyrics`) and sets it as the role's default `search_path`.

> The init script runs **only when the data volume is empty** (first boot). To add the schema
> to an existing database, run it manually:
> ```bash
> docker exec -it jamlyrics-postgres \
>   psql -U <user> -d <db> -c 'CREATE SCHEMA IF NOT EXISTS jamlyrics;'
> ```

## 2. Point the app at it

Set the backend's `DATABASE_URL` (Render env var, or `backend/.env` locally) to your VPS:

```
DATABASE_URL="postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@<VPS_IP>:<POSTGRES_PORT>/<POSTGRES_DB>?schema=<POSTGRES_SCHEMA>"
```

Example:
```
DATABASE_URL="postgresql://jamlyrics:yourpass@203.0.113.10:5432/jamlyrics?schema=jamlyrics"
```

Then apply the schema's tables and load data:
```bash
cd backend
npx prisma migrate deploy     # creates tables inside the jamlyrics schema
npm run seed                  # default admin
npm run load:songs            # optional: load the Munich songs
```

## 3. pgAdmin

Open `http://<VPS_IP>:5050`, log in with `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`.
The **JamLyrics VPS** server is already listed under *Servers* — click it and enter the
Postgres password to connect (pgAdmin never stores the DB password for you).

## Security (important — this exposes a database to the internet)

- Use **strong, unique** values for `POSTGRES_PASSWORD` and `PGADMIN_DEFAULT_PASSWORD`.
- **Firewall:** restrict port `5432` to only the hosts that need it (your app's egress IPs).
  If your host can't pin static IPs, prefer Postgres **SSL** (`sslmode=require`) and a strong password.
- Don't expose pgAdmin (`5050`) openly — put it behind a reverse proxy with TLS, an IP allow-list,
  or a VPN/SSH tunnel.
- Back up the `pgdata` volume regularly.
