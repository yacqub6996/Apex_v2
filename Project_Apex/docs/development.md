# Development Workflow

Use this guide for day-to-day work when you need to develop or debug outside Docker.

## Prerequisites

- Python 3.10+ with `uv` (or `pip`/`venv`)
- Node.js 20+ and npm
- PostgreSQL locally, or run the DB via Docker (`docker compose up db`)

## Backend

```bash
cd backend
uv venv && uv sync        # or: python -m venv .venv && pip install -e .
alembic upgrade head
fastapi dev app/main.py   # or: uvicorn app.main:app --reload
```

Common tasks:
- Tests: `python -m pytest`
- Lint/format: `bash scripts/format.sh` and `bash scripts/lint.sh`
- Migrations: `alembic revision --autogenerate -m "msg"` then `alembic upgrade head`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Common tasks:
- Build: `npm run build`
- Type check: `npm run type-check`
- Lint: `npm run lint`
- E2E (if Playwright is installed): `npx playwright test`

## Repository Layout (high level)

- `backend/` — FastAPI app, Alembic migrations, tests
- `frontend/` — React app, generated API client, Playwright tests
- `docker-compose*.yml` — service definitions for local and production
- `scripts/` — utility scripts (cleanup, API client generation, tests)

## Helpful URLs (local)

- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Frontend: `http://localhost:5173`
- MailCatcher: `http://localhost:1080`
- Adminer: `http://localhost:8080`
