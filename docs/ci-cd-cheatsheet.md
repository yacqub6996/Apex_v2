# Apex Portfolios – CI/CD Command Cheatsheet

Quick reference for deploying and troubleshooting the app across GitHub Actions, the VPS, Docker, and Alembic.

---

## 1. SSH into the VPS

```bash
# From your local machine
ssh root@srv1141968.hstgr.cloud
# or, if you have a different user:
ssh <user>@srv1141968.hstgr.cloud
```

If you ever rotate the server password/SSH key, update the corresponding GitHub Actions secrets used by the SSH action.

---

## 2. Key Directories on the VPS

```bash
# Docker deployment (backend + Postgres)
cd /home/apex-deployment

# LiteSpeed / public site root (served at https://apex-portfolios.org/)
cd /home/apex-portfolios.org/public_html

# If you need the bundled frontend build under the project subfolder
cd /home/apex-portfolios.org/public_html/Project_Apex/frontend/dist
```

---

## 3. Docker & Backend Commands

All commands are run from the VPS (after SSH).

### 3.1 Container lifecycle

```bash
cd /home/apex-deployment

# See running containers
docker ps

# See all containers (including stopped)
docker ps -a

# Start / restart only the backend (and its dependencies)
docker compose up -d backend

# Stop backend
docker compose stop backend

# Restart a single container
docker restart apex-deployment-backend-1

# Remove a stopped container (careful)
docker rm <container_id_or_name>

# Remove an unused image (careful)
docker rmi <image_id_or_name>
```

### 3.2 Logs

```bash
cd /home/apex-deployment

# Tail backend logs
docker logs --tail 100 apex-deployment-backend-1

# Follow backend logs
docker logs -f apex-deployment-backend-1

# Follow logs with timestamps
docker logs -f --since=10m apex-deployment-backend-1

# If you forget the container name, combine with ps
docker ps
docker logs --tail 100 <name-from-ps>
```

### 3.3 Exec into the backend container

```bash
cd /home/apex-deployment

# Open a shell in the backend container
docker exec -it apex-deployment-backend-1 bash

# One‑off commands
docker exec apex-deployment-backend-1 alembic upgrade heads
docker exec apex-deployment-backend-1 env | sort | grep -E 'POSTGRES|SMTP|EMAILS_FROM|FRONTEND_HOST'
```

### 3.4 Seed initial data

```bash
cd /home/apex-deployment

# Run the FastAPI project's initial_data script
docker exec -w /app apex-deployment-backend-1 python -m app.initial_data
```

---

## 4. Alembic Migrations (inside Docker)

```bash
cd /home/apex-deployment

# Run all migrations
docker exec apex-deployment-backend-1 alembic upgrade heads

# Show current revision
docker exec apex-deployment-backend-1 alembic current
```

If a migration fails, use `docker logs --tail 100 apex-deployment-backend-1` to inspect the stack trace.

---

## 5. Frontend Deployment on VPS

The GitHub Actions `deploy-frontend` job builds the Vite app and copies the contents of `Project_Apex/frontend/dist` to:

```bash
/home/apex-portfolios.org/public_html
```

### 5.1 Inspect deployed frontend

```bash
# List what LiteSpeed is serving
ls -l /home/apex-portfolios.org/public_html

# View the live index.html contents
head -40 /home/apex-portfolios.org/public_html/index.html
```

### 5.2 Fix permissions (what the workflow does)

If you need to repair permissions manually:

```bash
chmod 711 /home/apex-portfolios.org
chmod 755 /home/apex-portfolios.org/public_html
chmod 755 /home/apex-portfolios.org/public_html/assets
chmod 755 /home/apex-portfolios.org/public_html/images
find /home/apex-portfolios.org/public_html -type f -exec chmod 644 {} \;
```

These lines are also baked into the deploy workflow’s “Fix permissions” step so new deploys keep working.

### 5.3 Manual frontend hotfix when the site shows 404

Sometimes a failed/partial deploy or permission change can cause LiteSpeed to fall back to its own 404 page even though your built files exist. From VS Code’s integrated terminal (or any shell) you can recover with:

```bash
# 1) SSH into the VPS
ssh root@srv1141968.hstgr.cloud

# 2) Go to the public web root
cd /home/apex-portfolios.org/public_html

# 3) Restore index.html and static assets from the last built dist
#    (these live under the project folder created by the workflow)
cp -f Project_Apex/frontend/dist/index.html .
mkdir -p assets images
rsync -av --delete Project_Apex/frontend/dist/assets/ ./assets/
rsync -av --delete Project_Apex/frontend/dist/images/ ./images/
cp -f Project_Apex/frontend/dist/apex-favicon.svg .
cp -f Project_Apex/frontend/dist/vite.svg .

# 4) Re‑apply safe permissions
chmod 711 /home/apex-portfolios.org
chmod 755 /home/apex-portfolios.org/public_html
chmod 755 /home/apex-portfolios.org/public_html/assets
chmod 755 /home/apex-portfolios.org/public_html/images
find /home/apex-portfolios.org/public_html -type f -exec chmod 644 {} \;

# 5) Verify from the server
curl -ik https://apex-portfolios.org/ -H "Host: apex-portfolios.org"
```

If that `curl` returns `200` with your app’s HTML, but your browser still shows a 404, hard‑refresh (Ctrl+F5) or clear cache and try again.

---

## 6. LiteSpeed / Proxy Checks

### 6.1 Hit the site from the VPS as LiteSpeed sees it

```bash
curl -ik https://apex-portfolios.org/ -H "Host: apex-portfolios.org"
```

### 6.2 Confirm API proxy

The vhost is configured to proxy `/api/` to the Docker backend at `127.0.0.1:8000`. To sanity‑check:

```bash
curl -ik https://apex-portfolios.org/api/v1/openapi.json -H "Host: apex-portfolios.org"
curl -ik http://127.0.0.1:8000/docs
```

---

## 7. GitHub Actions – Deploy Workflows

### 7.1 Standard deploy flow

From your local dev machine:

```bash
cd C:/Users/HP/Projects/Apex_v2

# Check status
git status

# Commit your changes
git add .
git commit -m "feat: <short description>"

# Push to main (triggers deploy workflows)
git push origin main
```

Workflows:

- `deploy.yml` – usually backend (and/or shared infra).
- `deploy-production.yml` – frontend deploy + LiteSpeed .htaccess / permissions fixes.

### 7.2 Re‑run a failed workflow (GitHub UI)

1. Go to **GitHub → Actions → select workflow** (`deploy-backend` or `deploy-frontend`).
2. Click the failed run.
3. Use **“Re-run jobs”** → “Re-run all jobs”.

### 7.3 Optional: GitHub CLI shortcuts

If you install `gh` locally and authenticate:

```bash
# See recent runs
gh run list

# Watch the latest deploy-frontend run
gh run watch --workflow deploy-frontend.yml

# Manually trigger a workflow by file name
gh workflow run deploy-frontend.yml
```

---

## 8. Common API Smoke Tests (from VPS)

### 8.1 Signup & login

```bash
cd /home/apex-deployment

# Signup test user
curl -i http://localhost:8000/api/v1/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "debug@example.com",
    "password": "Password123!",
    "full_name": "Debug User",
    "website": ""
  }'

# Login
curl -i http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'username=debug@example.com&password=Password123!&scope='
```

### 8.2 Test email

```bash
# Use a valid admin Bearer token in $TOKEN
TOKEN="<paste-access-token>"

curl -i "http://localhost:8000/api/v1/utils/test-email/?email_to=you@example.com" \
  -X POST \
  -H "Authorization: Bearer $TOKEN"
```

---

## 9. Quick Troubleshooting Checklist

- **Frontend 404 at root**
  - Confirm `/home/apex-portfolios.org/public_html/index.html` exists and is readable (`stat` + `cat` / `head`).
  - Check file/dir permissions (see section 5.2).
  - Verify LiteSpeed is mapping `apex-portfolios.org` to the correct vhost (`/usr/local/lsws/conf/httpd_config.conf`).

- **Backend 5xx / “Internal Server Error” in UI**
  - `docker logs --tail 100 apex-deployment-backend-1`
  - Check for Alembic / SQL errors, missing columns, or unhandled exceptions.

- **Emails not arriving**
  - Confirm SMTP env vars inside container: `docker exec apex-deployment-backend-1 env | sort | grep SMTP`.
  - Use the `/api/v1/utils/test-email/` endpoint to verify config.

Keep this cheatsheet under `docs/ci-cd-cheatsheet.md` so you can quickly reference the exact commands you need during future deploys.***

# 1) SSH in
ssh root@72.61.201.159

# 2) Go to the live web root
cd /home/apex-portfolios.org/public_html

# 3) Restore the built frontend from the last dist that’s on the server
cp -f Project_Apex/frontend/dist/index.html .
mkdir -p assets images
rsync -av --delete Project_Apex/frontend/dist/assets/ ./assets/
rsync -av --delete Project_Apex/frontend/dist/images/ ./images/
cp -f Project_Apex/frontend/dist/apex-favicon.svg .
cp -f Project_Apex/frontend/dist/vite.svg .

# 4) Re‑apply permissions so LiteSpeed can read everything
chmod 711 /home/apex-portfolios.org
chmod 755 /home/apex-portfolios.org/public_html
chmod 755 /home/apex-portfolios.org/public_html/assets
chmod 755 /home/apex-portfolios.org/public_html/images
find /home/apex-portfolios.org/public_html -type f -exec chmod 644 {} \;

# 5) Verify from the server
curl -ik https://apex-portfolios.org/ -H "Host: apex-portfolios.org"
