FROM python:3.10-slim

# 1. Install 'uv'
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# 2. Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 3. Install System Dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 4. Copy Dependency Files
COPY pyproject.toml uv.lock* ./

# 5. Install Dependencies
RUN uv pip install --system --no-cache -r pyproject.toml

# 6. Copy Application Code
COPY app ./app
COPY scripts ./scripts

# --- FIX: Create missing static directory to prevent crash ---
RUN mkdir -p app/static
# -------------------------------------------------------------

# 7. Start the App
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]