FROM python:3.10-slim

# 1. Install 'uv' (The modern, fast package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# 2. Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 3. Install System Dependencies (Postgres & Build Tools)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 4. Copy Dependency Files
# We copy these first to leverage Docker caching
COPY pyproject.toml uv.lock* ./

# 5. Install Dependencies using uv
# --system: Install into the container's main Python environment (no venv needed inside Docker)
# --no-dev: Keep the image small by skipping testing tools
RUN uv pip install --system --no-cache -r pyproject.toml

# 6. Copy Application Code
# We do this LAST so that changing code doesn't force a re-install of dependencies
COPY app ./app
COPY scripts ./scripts

# 7. Start the App
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]