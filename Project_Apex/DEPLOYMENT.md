# Deployment Guide

Use this guide to ship the platform to a server (VPS, cloud VM, or bare metal) with Docker and Traefik.

## Prerequisites

- Ubuntu 22.04+ or another Linux distro with Docker Engine installed
- Domain DNS records pointing to the server (e.g., `dashboard.yourdomain.com`, `api.yourdomain.com`)
- Ports 80/443 open; SSH access with a non-root user
- `.env` populated with production secrets (copy from `.env.example`)

## 1) Prepare Locally

- Run `docker compose watch` or `docker compose up -d` and verify the app works.
- Run backend tests: `cd backend && python -m pytest`.
- Build frontend: `cd frontend && npm run build` (ensures assets compile).
- Clean workspace artifacts if needed: remove `frontend/dist`, `__pycache__`, and any local `.env.*` except `.env`.

## 2) Provision the Server

```bash
ssh user@server
sudo apt update && sudo apt upgrade -y
sudo apt install ca-certificates curl gnupg -y
# install Docker Engine + Compose plugin (see docs.docker.com/engine/install/)
sudo usermod -aG docker $USER
newgrp docker
```

Optional hardening:
- Enable UFW: allow 22/tcp, 80/tcp, 443/tcp.
- Add Fail2Ban for SSH.
- Set the correct timezone: `sudo timedatectl set-timezone <Region/City>`.

## 3) Configure Environment

Create `/opt/apex/.env` (or another deployment path) using `.env.example` as a template. Set:
- `DOMAIN`, `ENVIRONMENT`, `STACK_NAME`
- `SECRET_KEY`, `POSTGRES_PASSWORD`, `FIRST_SUPERUSER`, `FIRST_SUPERUSER_PASSWORD`
- `BACKEND_CORS_ORIGINS` for your domains
- Email/SMTP values if sending mail outside MailCatcher

Keep permissions strict: `chmod 600 .env`.

## 4) Deploy with Docker Compose

```bash
cd /opt/apex
docker compose -f docker-compose.yml -f docker-compose.traefik.yml pull   # optional
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d
docker compose exec backend alembic upgrade head
```

If Traefik runs separately, ensure `traefik-public` network exists and your labels match deployed domains.

## 5) Verify

- `docker compose ps` shows all services healthy.
- `curl http://localhost:8000/api/v1/utils/health-check/` returns `{"status":"ok"}`.
- Visit `https://dashboard.yourdomain.com` and `https://api.yourdomain.com/docs`.
- Check TLS via SSLLabs or a browser; renewals handled by Traefik/Let’s Encrypt.

## 6) Operations

- Logs: `docker compose logs -f backend` (or frontend/db/etc.).
- Rebuild with code updates: `git pull && docker compose build && docker compose up -d`.
- Backups: `docker exec $(docker compose ps -q db) pg_dump -U postgres app | gzip > backup.sql.gz`.
- Prune safely: `docker system prune` (avoid `-a` on production unless you understand impact).

## 7) Incident Checklist

- Failing container: `docker compose ps` ➜ `docker compose logs <service>` ➜ restart service.
- DB connection issues: ensure `POSTGRES_*` values match, and the `db` container is healthy.
- TLS problems: confirm DNS points to the server; inspect Traefik logs for ACME errors.
- Running out of disk: rotate logs (`/var/lib/docker/containers`), prune unused images/volumes after backups.

## References

- Docker setup and troubleshooting: `DOCKER_SETUP.md`
- Architecture overview: `docs/architecture.md`
- Security policy: `SECURITY.md`
