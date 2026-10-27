# Common Goods — Mini E-Commerce

A small, full-stack shopping application built as a college DevOps and containerization practical. The React/Vite frontend fetches product records from an Express API; the API reads persistent product data from PostgreSQL. Docker Compose builds and runs the three services on a dedicated bridge network.

## Technology stack

- **Frontend:** React 18, Vite, Nginx
- **Backend:** Node.js 20, Express, `pg`
- **Database:** PostgreSQL 16
- **Containers:** Dockerfiles and Docker Compose

## Project structure

```text
Root
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile
│   └── .dockerignore
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Architecture

```text
                         Browser
                            |
                 http://localhost:3000
                            |
             +--------------v---------------+
             | Frontend container           |
             | Nginx serves React/Vite build|
             | /api/* -> backend:5000       |
             +--------------+---------------+
                            |
                  custom bridge network
                     shop-network
                            |
             +--------------v---------------+
             | Backend container            |
             | Node.js + Express :5000      |
             +--------------+---------------+
                            |
             +--------------v---------------+
             | Database container           |
             | PostgreSQL :5432             |
             +--------------+---------------+
                            |
                  postgres-data volume
```

All three services join the user-defined `shop-network`. The browser only connects to the published Nginx port. Nginx forwards `/api/` requests to the Compose service name `backend`; the API connects to PostgreSQL at the Compose service name `db`. No host machine IP is embedded in the application.

## Dockerfiles

- **`backend/Dockerfile`** uses lightweight `node:20-alpine`, installs production dependencies, copies the API source into `/app`, runs as the unprivileged `node` user, and starts Express on container port 5000.
- **`frontend/Dockerfile`** is multi-stage. Its Node 20 build stage installs frontend dependencies and creates the Vite static build. Its Nginx Alpine production stage copies only the compiled files and custom Nginx configuration; Node.js is not present in the final image.

## Compose services, network, and data

- **`frontend`** builds `./frontend/Dockerfile`, publishes container port 80 at `${FRONTEND_PORT:-3000}`, and starts after the backend is healthy.
- **`backend`** builds `./backend/Dockerfile`, receives database credentials through environment variables, starts after PostgreSQL is healthy, and has a Node-based HTTP health check against `/api/health`.
- **`db`** runs `postgres:16-alpine`, checks readiness with `pg_isready`, and persists its database files in the named volume `postgres-data`. PostgreSQL is intentionally not published to the host.
- **`shop-network`** is a custom bridge network, allowing service-name DNS and private container-to-container communication.
- **`postgres-data`** survives container recreation and normal `docker compose down`. `docker compose down -v` removes it and **permanently deletes the persisted database data**.

On first API startup the backend creates the `products` table and inserts sample rows. The unique product slug and `ON CONFLICT DO NOTHING` make the seed repeatable without duplicates. Initialization retries transient database startup failures before the backend exits.

## Environment configuration

Compose loads settings from the root `.env` file. A local example `.env` is included for the practical; its password is a demonstration value, not a production secret. Change `POSTGRES_PASSWORD` and `DB_PASSWORD` to the same strong local value before use, and do not commit `.env`. `.gitignore` excludes it. For a new setup, copy `.env.example` to `.env` and replace its placeholder password.

| Variable | Purpose | Example/default |
| --- | --- | --- |
| `POSTGRES_DB` | Database initialized by the PostgreSQL image | `shop` |
| `POSTGRES_USER` | PostgreSQL application user | `shop_user` |
| `POSTGRES_PASSWORD` | Password used by PostgreSQL | Set in `.env` |
| `DB_HOST` | Host the backend uses; use the Compose service name | `db` |
| `DB_PORT` | PostgreSQL container port | `5432` |
| `DB_NAME` | Database used by the API; match `POSTGRES_DB` | `shop` |
| `DB_USER` | User used by the API; match `POSTGRES_USER` | `shop_user` |
| `DB_PASSWORD` | Password used by the API; match `POSTGRES_PASSWORD` | Set in `.env` |
| `API_PORT` | Port on which Express listens inside its container | `5000` |
| `FRONTEND_PORT` | Host port published by Nginx | `3000` |
| `IMAGE_TAG` | Tag applied to both locally built application images | `dev` |

The API defaults to port 5000, while Compose/Nginx use the stable internal API port 5000. Keep `API_PORT=5000` for this configuration. No database credentials are hardcoded in application source.

## Run locally

Prerequisites: Docker Desktop (or Docker Engine) with the Docker Compose plugin. From this project directory:

```sh
docker compose config
docker compose build
docker compose up -d
```

Or build and start in one command:

```sh
docker compose up -d --build
```

Then open **http://localhost:3000**.

```sh
docker compose ps
docker compose logs -f
curl http://localhost:3000/api/products
curl http://localhost:3000/api/health
```

The products endpoint returns PostgreSQL-backed JSON. The health endpoint returns `{"status":"ok","database":"connected"}` when the API can query the database.

Stop the containers without deleting database data:

```sh
docker compose down
```

Reset the application and delete the database volume:

```sh
docker compose down -v
```

**Warning:** `docker compose down -v` deletes `postgres-data`, including all persisted product or other database data.

## Image tags

Compose names the images `shop-api:${IMAGE_TAG:-dev}` and `shop-frontend:${IMAGE_TAG:-dev}`. The default `.env` produces:

- Development: `shop-api:dev`, `shop-frontend:dev`
- Testing: `shop-api:test`, `shop-frontend:test`
- Versioned release: `shop-api:1.0`, `shop-frontend:1.0`

To switch tags, change `IMAGE_TAG` in `.env` (for example, to `test`) and rebuild before starting:

```sh
docker compose build
docker compose up -d
```

For a versioned release, set `IMAGE_TAG=1.0` and run the same commands. The new tag is a separate image tag; it does not overwrite the `dev` or `test` tag.

## Deploy on a second machine

1. On the first machine, set the desired tag in `.env` (for example, `IMAGE_TAG=dev`) and build both application images:

   ```sh
   docker compose build
   ```

2. Export the exact tagged images:

   ```sh
   docker save -o shop-images.tar shop-api:dev shop-frontend:dev
   ```

3. Transfer `shop-images.tar`, `docker-compose.yml`, and `.env` to the second machine. Treat `.env` as sensitive configuration and transfer it securely. Ensure its `IMAGE_TAG` matches the exported image tag. Do not use a development password for an exposed deployment.

4. Install Docker Engine/Desktop and the Docker Compose plugin on the second machine. Its operating system and CPU architecture must be compatible with the exported images.

5. Load the images and start without rebuilding:

   ```sh
   docker load -i shop-images.tar
   docker compose up -d --no-build
   ```

6. Open `http://localhost:3000` on the second machine and check the frontend and API:

   ```sh
   curl http://localhost:3000/api/products
   curl http://localhost:3000/api/health
   ```

The database volume is not included in the image archive. This procedure starts a fresh database and seeds the sample products. If existing database contents must be transferred, export and migrate PostgreSQL data separately (for example, with `pg_dump` and `pg_restore`).

## Troubleshooting

- **Frontend cannot load products:** run `docker compose ps` and `docker compose logs -f backend db`. Wait until both health checks pass, then refresh.
- **Database password or startup errors:** confirm `POSTGRES_PASSWORD` equals `DB_PASSWORD`, and that `DB_NAME`/`DB_USER` match `POSTGRES_DB`/`POSTGRES_USER`. PostgreSQL keeps credentials from the first initialization in its volume; changing `.env` does not rewrite an existing database user. For a disposable practical database, `docker compose down -v` resets it (this deletes data).
- **Port 3000 is already in use:** change `FRONTEND_PORT` in `.env` (for example, `3001`) and browse to that host port.
- **Changes do not appear:** rebuild the images with `docker compose up -d --build`.
- **Cannot start with `--no-build`:** ensure the images were loaded and that `.env` has the matching `IMAGE_TAG`.
- **Compose variable warnings:** check that `.env` exists in the same directory as `docker-compose.yml` and contains all required values.
