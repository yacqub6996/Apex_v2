# Apex Trading Platform

Full-stack trading platform with FastAPI, React/TypeScript, PostgreSQL, and Docker-first workflows.

## Quick Start (Docker)

```bash
cp .env.example .env          # update secrets before running
docker compose watch          # hot reload backend + frontend
# or: docker compose up -d    # run detached
```

Services:
- Frontend: http://localhost:5173 or http://dashboard.localhost
- API: http://localhost:8000 or http://api.localhost
- API docs: http://localhost:8000/docs
- Adminer: http://localhost:8080
- MailCatcher: http://localhost:1080

## Local Development (no Docker)

- Backend: `cd backend && uv venv && uv sync && alembic upgrade head && fastapi dev app/main.py`
- Frontend: `cd frontend && npm install && npm run dev`
- API health check: `http://localhost:8000/api/v1/utils/health-check/`

## Documentation

- Docker setup & troubleshooting: `DOCKER_SETUP.md`
- Production deployment: `DEPLOYMENT.md`
- Architecture overview: `docs/architecture.md`
- Development workflow: `docs/development.md`
- Backend guide: `backend/README.md`
- Frontend guide: `frontend/README.md`
- Security policy: `SECURITY.md`

## Environment

Copy `.env.example` to `.env` and set at minimum:
- `POSTGRES_PASSWORD`
- `SECRET_KEY` (generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- `FIRST_SUPERUSER` and `FIRST_SUPERUSER_PASSWORD`

## Project Structure

```
Project_Apex/
├─ backend/      # FastAPI app, Alembic, tests
├─ frontend/     # React app, generated API client
├─ docs/         # Minimal architecture and dev notes
├─ DOCKER_SETUP.md
├─ DEPLOYMENT.md
└─ SECURITY.md
```

## Getting Help

- Troubleshoot common Docker issues: see `DOCKER_SETUP.md`
- Deployment questions: see `DEPLOYMENT.md`
- File issues or questions in the repository with logs and steps to reproduce
