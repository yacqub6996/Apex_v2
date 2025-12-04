Hybrid Deployment Strategy

Phase 1: Hybrid Architecture Overview

Here is your Final "Hybrid" Deployment Guide.

This keeps your SMTP, keeps your GUI, but runs your "Apex" backend in a modern Docker container.

Phase 1: The "Hybrid" Architecture

Instead of one big Docker file, we split the app:

Frontend: Hosted as a "Static Website" in CyberPanel (Fastest, zero CPU overhead).

Backend: Hosted in Docker on Port 8000 (Isolated, easy to update).

The Bridge: We use CyberPanel's "Rewrite Rules" to connect them.

Phase 2: Agent Instructions for Configuration

Phase 2: The Agent Prompt (Generate the Configs)

Paste this to your coding agent.

It will generate the exact files you need for this hybrid setup, stripping out the dangerous Traefik parts.

Copy/Paste this to your Agent:

workspace

We are deploying to a **Hostinger VPS with CyberPanel**.

We are using a "Hybrid" approach:

Frontend = Static files hosted directly by CyberPanel (NO Docker for frontend).

Backend = Docker container running FastAPI on port 8000.

Database = Docker container (Postgres 15).

*Task:**

Backend Dockerfile Configuration

Use `python:3.10-slim`.

Install dependencies.

CMD: `uvicorn app.main:app --host 0.0.0.0 --port 8000` (Verify the app import path matches my structure).

Docker Compose Setup

Service: `db` (Postgres 15).

Volume: `./postgres_data:/var/lib/postgresql/data`

Ports: **Do not expose ports**, only internal network.

Service: `backend`

Build: `./backend`

Ports: `127.0.0.1:8000:8000` (Bind strictly to localhost so it's not open to the public web).

Depends_on: `db`.

Env_file: `.env`.

*Extra_Hosts:** Add `host.docker.internal:host-gateway` (This allows the container to talk to the CyberPanel SMTP server).

GitHub Actions Deployment Workflow

*Job 1 (Backend):** Build/Push Docker image -> SSH to VPS -> Pull/Restart.

Frontend Deployment Task

*Job 2 (Frontend):** Build React (`npm run build`) -> SCP the **contents** of the build folder to `/home/apex-portfolios.org/public_html`.

Deployment Restrictions

*Constraint:**

Do NOT generate any Traefik configuration.

Do NOT generate a frontend Dockerfile.

Server Environment and Configuration

Phase 3: The Manual Setup (Do this once)

While the Agent writes your code, perform these 4 steps on your server.

Prepare the Database & Env

SSH into your server:

# Create the folder

mkdir -p /home/apex-deployment

# Create the .env file

nano /home/apex-deployment/.env

Paste this inside .env:

# Database

POSTGRES_USER=apex_user

POSTGRES_PASSWORD=secure_random_password

POSTGRES_DB=apex_db

DATABASE_URL=postgresql://apex_user:secure_random_password@db:5432/apex_db

# SMTP (Connecting to CyberPanel)

# Use 'host.docker.internal' because we added the extra_host mapping in Docker Compose

SMTP_HOST=host.docker.internal

SMTP_PORT=587

SMTP_USER=support@apex-trading.com

SMTP_PASSWORD=your_email_password

Website Creation Step

Create the Website in CyberPanel

Initial Website Creation in CyberPanel

Log in to CyberPanel (usually port 8090).

Websites -> Create Website.

Domain: apex-trading.com (Select PHP 8.1, Check "SSL").

Configuring Rewrite Rules for Traffic Routing

Connect the "Glue" (Rewrite Rules)

This sends API traffic to Docker and keeps the Frontend static.

Go to Websites -> List Websites -> Manage (Apex).

Click Rewrite Rules.

Delete everything and paste this:

# 1. Proxy API requests to Docker (Port 8000)

RewriteRule ^api/(.*)$ http://127.0.0.1:8000/api/$1 [P,L]

# 2. Proxy Swagger Docs (Optional)

RewriteRule ^docs(.*)$ http://127.0.0.1:8000/docs$1 [P,L]

RewriteRule ^openapi.json$ http://127.0.0.1:8000/openapi.json [P,L]

# 3. Proxy WebSockets (Copy Trading Feeds)

RewriteCond %{HTTP:Upgrade} =websocket [NC]

RewriteRule ^api/(.*) ws://127.0.0.1:8000/api/$1 [P,L]

# 4. React Router Fallback (Frontend)

RewriteCond %{REQUEST_FILENAME} !-f

RewriteCond %{REQUEST_FILENAME} !-d

RewriteRule . /index.html [L]

Final Deployment Step

Deploy!

Push your code to GitHub.

Automated Build and Deployment Process

Action: GitHub will build your backend and push it to the server.

Action: GitHub will build your frontend and upload the files to public_html.

Outcome of the Deployment

Result: You have a fully deployed app, keeping your CyberPanel email and GUI intact.