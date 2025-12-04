# Backend (FastAPI)

FastAPI + SQLModel + PostgreSQL backend for the Apex Trading Platform.

## Quick Start (Docker)

```bash
docker compose up -d backend db adminer
docker compose logs -f backend
```

## Local Development

```bash
cd backend
uv venv && uv sync          # or: python -m venv .venv && pip install -e .
alembic upgrade head
fastapi dev app/main.py     # or: uvicorn app.main:app --reload
```

## Environment

Required variables (see `.env.example`):

```env
DATABASE_URL=postgresql+psycopg://postgres:<password>@localhost/app
SECRET_KEY=<generate>
FIRST_SUPERUSER=admin@example.com
FIRST_SUPERUSER_PASSWORD=<generate>
SMTP_HOST=localhost
SMTP_PORT=1025
FRONTEND_URL=http://localhost:5173
```

## Common Commands

- Tests: `python -m pytest`
- Format/Lint: `bash scripts/format.sh` then `bash scripts/lint.sh`
- Migrations: `alembic revision --autogenerate -m "msg"`; apply with `alembic upgrade head`
- Shell inside container: `docker compose exec backend bash`

## Useful URLs

- API: http://localhost:8000
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/v1/utils/health-check/

For deployment guidance see `DEPLOYMENT.md`; for architecture see `docs/architecture.md`.
