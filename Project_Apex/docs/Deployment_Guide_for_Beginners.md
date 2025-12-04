Comprehensive Deployment Guide for Beginners

Introduction and Deployment Goals

This is a comprehensive, step-by-step guide designed for an absolute beginner.

We will not skip any details.

We will go from "logging in" to "live website," ensuring you navigate both the Command Line (SSH) and the CyberPanel GUI confidently.

🚀 The Absolute Beginner's Deployment Guide (Hostinger CyberPanel Edition)

Goal:

Frontend (React): Hosted as simple static files on CyberPanel (Fast & Free).

Backend (FastAPI): Hosted inside Docker to run your Python code safely.

Email: Managed by CyberPanel (so your automated emails work).

Phase 1: Pre-Server Code Configuration

🛠 Phase 1: Preparation (Before touching the Server)

You need to have your code ready on your computer first.

Get the Config Files (Using your Agent)

Paste the "Phase 2 Agent Prompt" from our previous chat into your coding tool (Cursor/VS Code).

Wait for it to generate `backend/Dockerfile`, `docker-compose.yml`, and `.github/workflows/deploy.yml`.

Save these files into your project folder.

Push these changes to GitHub:

```bash

git add .

```

Initial Git Operations

git commit -m "Add deployment config"

git push origin main

Setting Up Website and Email via CyberPanel Interface

We will configure the website and email using the visual dashboard.

Log in to CyberPanel

Go to your Hostinger Dashboard.

Click on your VPS -> Panel Access.

Click the Login URL (it usually looks like `https://123.123.123.123:8090`).

Enter your admin username and password.

Create the Website

On the left sidebar, click Websites -> Create Website.

Fill in the form:

Select Package: Default.

Select Owner: admin.

Domain Name: `apex-trading.com` (Do not add `www` here; it does it automatically).

Email: `support@apex-trading.com` (This creates your email account).

Select PHP: PHP 8.1 (This doesn't matter much for us, but 8.1 is safe).

Additional Features: Check SSL and DKIM Support (Critical for emails).

Click Create Website. Wait about 30-60 seconds for success.

Transition to Command Line Interface

💻 Phase 3: The Command Line (SSH Setup)

Connecting to Your Server via SSH

Now we need to create the folders where your Backend (Docker) will live.

How to SSH (Connect to your Server)

Windows: Open PowerShell or Command Prompt.

Mac/Linux: Open Terminal.

Type this command and hit Enter:

ssh root@YOUR_SERVER_IP

# Example: ssh root@192.158.1.25

If it asks "Are you sure...", type `yes`.

Enter your VPS Root Password (you won't see the letters typing, that's normal).

Installing Docker Engine

Install Docker (If not installed)

Copy and paste these commands one by one to ensure Docker is ready.

dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

dnf install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y

systemctl start docker

systemctl enable docker

Creating the Backend Project Directory and Configuration File

Setup the Project Folder

We will create a specific folder for the backend to live in.

mkdir -p /home/apex-deployment

cd /home/apex-deployment

nano .env

Next Steps

4.

Environment Configuration and Initial Checks

Edit the `.env` file

You are now inside a text editor called nano.

No grammatical errors or typos were found.

Post-Deployment Verification Procedures

Once the GitHub Action turns green (Success):

Check Frontend: Visit https://apex-trading.com. You should see your React App.

Check Backend: Visit https://apex-trading.com/api/docs (or your health check endpoint). You should see the FastAPI documentation or a JSON response.

Check Email: Use the "Forgot Password" feature on your app. It should send an email via support@apex-trading.com.