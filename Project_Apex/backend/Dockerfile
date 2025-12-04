FROM python:3.10-slim

# Set working directory to /app
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies (required for psycopg2/Postgres)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definitions
COPY pyproject.toml .
# Copy alembic config if it exists at root of backend
COPY alembic.ini .

# Install dependencies
# We use 'pip install .' because your start.sh indicates the project is installable
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

# Copy the application code
COPY app ./app
COPY scripts ./scripts

# Expose the port
EXPOSE 8000

# Run the application
# Using the path found in your workspace: app.main:app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
