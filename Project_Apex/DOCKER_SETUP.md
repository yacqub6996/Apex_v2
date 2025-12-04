# Docker Setup & Troubleshooting

Use this guide to get the platform running quickly with Docker on Windows, macOS, or Linux.

## Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- 4 CPU cores and 8GB RAM available
- Git, Node.js 20+, Python 3.10+ (for optional non-Docker dev work)

### Install Docker

- **Windows**: Install Docker Desktop with WSL 2 enabled. Verify with `docker --version` and `docker compose version`.
- **macOS**: Install Docker Desktop (Intel or Apple Silicon build). Verify versions as above.
- **Linux**: Install Docker Engine + Compose plugin from https://docs.docker.com/engine/install/. Add your user to the `docker` group and restart the session.

## Environment Setup

```bash
cp .env.example .env
# Set these before running:
# - POSTGRES_PASSWORD
# - SECRET_KEY (generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")
# - FIRST_SUPERUSER and FIRST_SUPERUSER_PASSWORD
```

## Compose Files

- `docker-compose.yml`: Base stack (db, backend, frontend, adminer, mailcatcher, proxy).
- `docker-compose.override.yml`: Local dev overrides (hot reload, exposed ports). Loaded automatically.
- `docker-compose.traefik.yml`: Production-ready Traefik + TLS. Use with `-f` when deploying.

## Run the Stack

```bash
# From the project root
docker compose watch          # recommended for dev (hot reload)
# or
docker compose up -d          # background mode
```

Common commands:
- Status: `docker compose ps`
- Logs (all): `docker compose logs -f`
- Logs (service): `docker compose logs -f backend`
- Rebuild: `docker compose build` or `docker compose build --no-cache`
- Stop: `docker compose down`
- Reset state: `docker compose down -v` (removes database volume)

## Service Endpoints (local)

| Service      | URL                               |
|--------------|-----------------------------------|
| Frontend     | http://localhost:5173 / http://dashboard.localhost |
| Backend API  | http://localhost:8000 / http://api.localhost       |
| API Docs     | http://localhost:8000/docs        |
| Adminer      | http://localhost:8080             |
| MailCatcher  | http://localhost:1080             |
| Traefik (dev)| http://localhost:8090             |

## Troubleshooting

- **Docker daemon not running**: Start Docker Desktop or `sudo systemctl start docker`.
- **Port already in use**: `netstat -ano | findstr :5432` (Windows) or `lsof -i :5432` (macOS/Linux); stop the conflicting process or change the port in `docker-compose.override.yml`.
- **Services exit immediately**: Check `docker compose logs <service>`; usually missing env vars or a DB that is still starting.
- **Hot reload not working**: Restart with `docker compose down` then `docker compose watch`; ensure file changes are inside the bind mounts.
- **Disk space issues**: `docker system df` ➜ `docker system prune`; add `-a` only if you understand it will remove all unused images.
- **TLS problems in prod**: Confirm DNS points to the server and review Traefik logs for ACME errors.

## Next Steps

- Need manual dev (no Docker)? See `docs/development.md`.
- Deploying to a server? See `DEPLOYMENT.md`.
