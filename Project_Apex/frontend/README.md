# Frontend (React)

React 19 + TypeScript + Vite UI for the Apex Trading Platform using Material UI, TanStack Router, and React Query.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173.

## Environment

Create `.env.local` with:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=<optional Google OAuth client id>
```

## Common Commands

- Build: `npm run build`
- Lint: `npm run lint`
- Type check: `npm run type-check`
- Preview prod build: `npm run preview`
- E2E (if Playwright installed): `npx playwright test`

## API Client

Regenerate the TypeScript SDK after backend schema changes:

```bash
bash scripts/generate-client.sh
```

## Notes

- Material UI components are the primary UI layer; legacy components in `components/base` are deprecated.
- Keep auth and API calls through the provided providers/hooks to preserve typing and caching.

For deployment and Docker details see `DEPLOYMENT.md` and `DOCKER_SETUP.md`.
