# Architecture Overview

This document summarizes how the platform is assembled so new contributors and operators know where to look when troubleshooting or extending the system.

## Major Components

- **Frontend**: React + TypeScript (Vite) served by the `frontend` container; uses TanStack Router, React Query, and Material UI.
- **Backend**: FastAPI application in `backend/app`; SQLModel for data access; Alembic for migrations; JWT-based auth with optional Google OAuth.
- **Database**: PostgreSQL 17 persisted via the `app-db-data` Docker volume.
- **Reverse proxy**: Traefik handles routing for local (`*.localhost`) and production domains (via `docker-compose.traefik.yml`).
- **Auxiliary services**: Adminer for DB administration and MailCatcher for local email testing.

## Request Flow

1. Browser hits Traefik (or Vite dev server in local development).
2. Traefik routes traffic to the `frontend` container (static assets) or `backend` container (API at `/api/v1`).
3. Backend serves JSON responses, issues JWTs, and persists data in PostgreSQL.
4. Frontend uses the generated API client for type-safe calls and React Query for caching and retries.

## Data and Secrets

- Environment variables are defined in `.env` (copy from `.env.example`).
- Secrets: `SECRET_KEY`, `POSTGRES_PASSWORD`, and `FIRST_SUPERUSER_PASSWORD` must be rotated per environment.
- Data persists in Docker volumes; clean with `docker compose down -v` only when you intend to wipe state.

## Deployment Notes

- Local: `docker compose watch` for hot reload; falls back to Vite and FastAPI dev servers without Docker if needed.
- Production: combine `docker-compose.yml` with `docker-compose.traefik.yml` for TLS, domain routing, and hardened settings.
- Health: `http://localhost:8000/api/v1/utils/health-check/` reports backend status; Traefik dashboard is disabled by default in production configs.
