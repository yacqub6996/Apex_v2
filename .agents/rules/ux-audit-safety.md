---
name: ux-audit-safety
description: Strict safety rules for Project Apex read-only UX research and benchmarking.
trigger: always_on
---

# Project Apex — UX Audit Safety & Read-Only Governance

These rules govern all UX research, benchmarking, visual observation, and interaction auditing across Project Apex.

## 1. Absolute Read-Only Enforcement
- **Deny Git Writes**: Never execute `git commit`, `git push`, `git merge`, `git tag`, or branch modifications during an audit session.
- **Deny Deployment Commands**: Prohibit execution of deployment scripts, container publish steps (`docker push`, `railway up`, `fly deploy`, etc.), or production infrastructure mutations.
- **Deny Application Code Modifications**: Do not edit, overwrite, delete, or reformat any Apex frontend or backend source files (`Project_Apex/frontend/src/**`, `Project_Apex/backend/app/**`, etc.).
- **Deny Database Mutations**: Do not run database migrations (`alembic upgrade/downgrade`), SQL `INSERT`/`UPDATE`/`DELETE`/`DROP` statements, or direct database mutators.

## 2. Financial Safety & Real Fund Protection
- **No Real Capital Operations**: Strictly prohibit approving, rejecting, initiating, or signing real cryptocurrency, fiat, or copy-trading transactions.
- **No Private Keys / Admin Portals**: Never access or request production private keys, seed phrases, custody wallets, database credentials, or admin superuser credentials.
- **Controlled Sandbox Only**: All authenticated interaction must take place strictly inside a disposable, controlled non-personal UX test account with paper/simulated balances.
- **Observation Only in Production**: If staging/production UI is visually inspected, interaction is strictly restricted to navigational reading and state observation without triggering state mutations.

## 3. Credential Security & Privacy
- **Zero Credential Persistence**: Never store usernames, passwords, API tokens, session cookies, or JWTs in repository files, markdown artifacts, `.agents` files, or git commits.
- **Environment Ingestion**: Credentials must be supplied transiently via secure environment variables or prompted at runtime, never written into code.

## 4. Ethical Financial UX Standards
- Recommendations must never propose:
  - Obscuring fee schedules, slippage estimates, or performance fees.
  - Hiding or downplaying downside financial risks, drawdowns, or margin requirements.
  - Designing dark patterns, artificial scarcity, or manufactured urgency.
  - Gamified celebrating of speculative or leveraged financial losses/gains.
