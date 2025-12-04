# Apex Trading Platform - Copilot Instructions

Use these instructions to be productive immediately in this codebase. Keep guidance concrete and specific to this repo.

> **📍 Navigation**: For comprehensive documentation, see [docs/index.md](../docs/index.md)  
> **🤖 Agent Resources**: See [docs/development/agent-resources/](../docs/development/agent-resources/) for prompts and handoffs

## Project Overview

**Full-stack trading platform** with FastAPI backend, React/TypeScript frontend, and PostgreSQL. Features RBAC authentication, copy trading with ROI pushes, long-term investments, and complete KYC verification flow.

## Architecture Overview

### Tech Stack
- **Backend**: FastAPI 0.115+ + SQLModel + PostgreSQL + Alembic
- **Frontend**: React 19 + TypeScript + Vite 7 + TanStack Router + React Query + Material UI 7
- **Auth**: JWT-based RBAC with Google OAuth
- **Deployment**: Docker Compose with Traefik proxy, Adminer, MailCatcher

### Project Structure
```
Project_Apex/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app initialization
│   │   ├── models.py            # SQLModel database models
│   │   ├── crud.py              # Database CRUD operations
│   │   ├── api/                 # API routes
│   │   │   ├── main.py          # API router aggregation
│   │   │   └── routes/          # Individual route modules
│   │   ├── core/                # Core utilities (config, db, security)
│   │   ├── services/            # Business logic services
│   │   └── tests/               # Backend tests
│   └── alembic/                 # Database migrations
├── frontend/
│   ├── src/
│   │   ├── main.tsx            # App entry point
│   │   ├── routes/             # TanStack Router file-based routes
│   │   ├── pages/              # Page components
│   │   ├── components/         # Reusable components
│   │   ├── api/                # Generated API client
│   │   ├── providers/          # React context providers
│   │   └── hooks/              # Custom React hooks
│   └── scripts/                # Build and deploy scripts
└── docs/                        # Comprehensive documentation
    ├── frontend/                # Frontend-specific documentation
    ├── backend/                 # Backend-specific documentation
    └── development/             # Development resources
        └── agent-resources/     # Agent prompts and handoffs
```

## Local Development

### Quick Start
```bash
# Full stack with Docker (recommended)
docker compose watch  # Auto-reload on changes

# Or develop components separately
cd backend && uv sync && fastapi dev app/main.py  # Backend on :8000
cd frontend && npm install && npm run dev          # Frontend on :5173
```

### Access Points
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- Adminer: `http://localhost:8080`
- MailCatcher: `http://localhost:1080`
- Traefik Dashboard: `http://localhost:8090`

## Backend Development

### Adding a New Feature

1. **Model**: Add SQLModel model in `backend/app/models.py`
2. **Migration**: Run `docker compose exec backend alembic revision --autogenerate -m "description"`
3. **Apply**: `docker compose exec backend alembic upgrade head`
4. **CRUD**: Add operations in `backend/app/crud.py`
5. **Route**: Create route file in `backend/app/api/routes/`
6. **Register**: Add to `backend/app/api/main.py` imports and `api_router.include_router()`
7. **Test**: Add tests in `backend/app/tests/`

### Backend Conventions
- **Python env**: Managed with `uv` (install: `uv sync`, venv: `backend/.venv`)
- **Linting**: Ruff (format: `bash scripts/format.sh`, lint: `bash scripts/lint.sh`)
- **Type checking**: MyPy strict mode
- **Testing**: Pytest (`bash scripts/test.sh` or `docker compose exec backend bash scripts/tests-start.sh`)
- **Settings**: Environment variables from `.env` (change all `changethis` secrets before deploy)
- **API versioning**: All routes under `/api/v1`

### Key Backend Files
- `app/core/config.py`: Settings and configuration
- `app/core/db.py`: Database engine and session
- `app/core/security.py`: JWT and password hashing
- `app/models.py`: All SQLModel models (User, Trader, Trade, etc.)
- `app/crud.py`: Database operations
- `app/utils.py`: Utility functions

## Frontend Development

### Tech Stack Details
- **Framework**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 7 with SWC compiler
- **UI Framework**: Material UI 7 (migrated from Untitled UI, ~85% complete)
- **Routing**: TanStack Router (file-based)
- **State**: React Query (TanStack Query) for server state
- **Icons**: Material UI Icons + Untitled UI Icons
- **Styling**: Material UI `sx` prop + TailwindCSS 4 utilities

### Adding a New Page

1. **Create route file**: `frontend/src/routes/new-page.tsx`
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { NewPage } from '@/pages/new-page'

export const Route = createFileRoute('/new-page')({
  component: NewPage,
})
```

2. **Create page component**: `frontend/src/pages/new-page.tsx`
```tsx
import { Box, Typography, Button } from '@mui/material'

export const NewPage = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">New Page</Typography>
      <Button variant="contained">Action</Button>
    </Box>
  )
}
```

3. **Route auto-generates**: TanStack Router CLI watches for changes

### Auth-Protected Routes

Use `RouteGuard` component for authentication:

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RouteGuard } from '@/components/auth/route-guard'
import { PageLayout } from '@/components/layouts/page-layout'

export const Route = createFileRoute('/protected')({
  component: () => (
    <RouteGuard requireAuth={true} allowedRoles={['user', 'trader']}>
      <PageLayout>
        <Outlet />
      </PageLayout>
    </RouteGuard>
  ),
})
```

### Authentication UX patterns (Nov 2025)

- Login errors must render an inline prompt with a clear Sign up CTA. Persist a small localStorage flag so the prompt survives an unexpected reload.
- Replace all custom success overlays with Material UI Dialogs for both login and signup. Use short, timed redirects after success.
- Ensure the shared Form wrapper calls `event.preventDefault()` and then delegates to the provided `onSubmit` to avoid page reload loops.
- Keep a single forced reload after Google login to ensure the auth provider picks up the new token.

Key files:
- `frontend/src/components/shared-assets/login/login-split-carousel.tsx`
- `frontend/src/components/shared-assets/signup/signup-split-carousel.tsx`
- `frontend/src/components/base/form/form.tsx`
- `frontend/src/providers/auth-provider.tsx`

### Data Fetching Patterns

**React Query with generated API client:**

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TradersService } from '@/api'

// Query
const { data: traders, isLoading } = useQuery({
  queryKey: ['traders'],
  queryFn: () => TradersService.listTraders(),
})

// Mutation with cache invalidation
const queryClient = useQueryClient()
const mutation = useMutation({
  mutationFn: (data) => TradersService.createTrader(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['traders'] })
  },
})
```

### Material UI Styling Patterns

**Prefer `sx` prop over TailwindCSS for component-specific styles:**

```tsx
// ✅ Good: Material UI sx prop
<Box sx={{
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  gap: 2,
  p: 3,
  bgcolor: 'background.paper',
  borderRadius: 2,
}}>
  <Typography variant="h6" color="text.primary">Title</Typography>
</Box>

// ⚠️ Acceptable: TailwindCSS for simple layouts
<div className="flex flex-col gap-4 p-4">

// ❌ Avoid: Inline styles
<div style={{ padding: '16px' }}>
```

### Component Patterns

**Material UI components to use:**
- `Button`, `IconButton`: Actions
- `TextField`: Form inputs
- `Chip`: Badges and tags
- `Card`, `CardContent`, `CardHeader`: Containers
- `Dialog`, `DialogTitle`, `DialogContent`: Modals
- `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`: Data tables
- `Tabs`, `Tab`: Navigation
- `Box`, `Stack`, `Grid`: Layouts
- `Typography`: Text with theme variants

### API Client Generation

**After backend API changes:**

```bash
cd frontend
bash scripts/generate-client.sh
```

This:
1. Exports backend OpenAPI spec to `frontend/openapi.json`
2. Generates TypeScript client in `frontend/src/api/`
3. Formats code with Prettier

**Using generated client:**

```tsx
import { UsersService, TradersService, TradesService } from '@/api'
import type { UserPublic, TraderPublic, TradeCreate } from '@/api'
```

### Frontend Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run preview          # Preview production build
npm run routes:generate  # Generate TanStack Router routes
npm run routes:watch     # Watch mode for route generation
```

## Testing

### Backend Tests
```bash
# With Docker
docker compose exec backend bash scripts/tests-start.sh

# Or locally
cd backend
bash scripts/test.sh
```

### Frontend E2E Tests
```bash
cd frontend
npx playwright test
npx playwright test --ui  # With UI
```

## Database Migrations

### Creating Migrations
```bash
# Auto-generate from model changes
docker compose exec backend alembic revision --autogenerate -m "Add new column"

# Apply migrations
docker compose exec backend alembic upgrade head

# Rollback
docker compose exec backend alembic downgrade -1
```

## Common Workflows

### End-to-End Feature Addition

1. **Backend**:
   - Add model to `backend/app/models.py`
   - Create migration with Alembic
   - Add CRUD operations to `backend/app/crud.py`
   - Create route in `backend/app/api/routes/feature.py`
   - Register route in `backend/app/api/main.py`
   - Add tests

2. **Frontend**:
   - Run `bash scripts/generate-client.sh` to update API client
   - Create route file in `frontend/src/routes/`
   - Create page component in `frontend/src/pages/`
   - Use React Query for data fetching
   - Style with Material UI components

3. **Test**:
   - Backend: `bash scripts/test.sh`
   - Frontend: `npx playwright test`

### Updating Environment Variables

1. Edit `.env` file (copy from `.env.example` if needed)
2. Restart services: `docker compose down && docker compose up -d`

### Checking Logs

```bash
docker compose logs -f backend   # Backend logs
docker compose logs -f frontend  # Frontend logs
docker compose logs -f db        # Database logs
```

## Key Conventions

### Code Style
- **Backend**: Ruff formatter, MyPy strict, snake_case
- **Frontend**: Prettier, ESLint, camelCase
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, etc.)

### File Organization
- **Backend routes**: One file per resource in `backend/app/api/routes/`
- **Frontend routes**: File-based routing in `frontend/src/routes/`
- **Components**: Organized by type in `frontend/src/components/`

### API Design
- RESTful endpoints under `/api/v1`
- Consistent response formats
- Proper HTTP status codes
- OpenAPI/Swagger docs auto-generated

## Deployment

### Production Build
```bash
# Backend
cd backend
docker build -t apex-backend .

# Frontend
cd frontend
docker build -t apex-frontend .
```

### Environment Configuration
- Production requires external Traefik network
- Configure domains via `DOMAIN` env var
- Set secure secrets (not `changethis`)
- Enable HTTPS with Let's Encrypt

## Documentation Structure

Comprehensive documentation organized by area:

### 📁 Frontend Documentation
**Location**: [docs/frontend/](../docs/frontend/)
- Frontend development guide with React, TypeScript, Material UI
- MUI migration status (90% complete) and quick reference
- Dashboard implementation guide
- User guides for all features
- Component technical guides

### 📁 Backend Documentation
**Location**: [docs/backend/](../docs/backend/)
- API reference for all endpoints
- Copy trading system details
- KYC verification system
- Long-term investment plans
- Backend operations guide
- Admin operations guide
- Deployment guide

### 📁 Development Resources
**Location**: [docs/development/](../docs/development/)
- **Agent Resources** ([agent-resources/](../docs/development/agent-resources/))
  - Prompt templates for common tasks
  - Agent handoff documents
- Implementation logs (timestamped)
- Completion reports
- Debugging guides
- Archived documentation

### 📄 Core Documentation
- **[Complete Index](../docs/index.md)**: Complete documentation catalog
- **[Architecture](../docs/architecture.md)**: System design details
- **[Development Setup](../docs/development.md)**: Setup and workflows

## Troubleshooting

### Common Issues

**Backend not starting:**
- Check database connection in logs
- Verify `.env` configuration
- Ensure migrations are applied

**Frontend API errors:**
- Verify `VITE_API_URL` is set correctly
- Check backend is running on expected port
- Regenerate API client if backend changed

**Database issues:**
- Check PostgreSQL logs: `docker compose logs db`
- Verify credentials in `.env`
- Try: `docker compose down -v && docker compose up -d`

## Security

- JWT authentication with role-based access control
- Bcrypt password hashing
- KYC verification for withdrawals
- Admin approval for sensitive operations
- **Never commit secrets**: Use `.env` (gitignored)
- Change all `changethis` values before deployment

## Getting Help

1. Check relevant documentation in `docs/` organized by area:
   - Frontend work: [docs/frontend/](../docs/frontend/)
   - Backend work: [docs/backend/](../docs/backend/)
   - Development/Agents: [docs/development/](../docs/development/)
2. Review API docs at `http://localhost:8000/docs`
3. Check logs with `docker compose logs`
4. Review existing code for patterns
5. See `docs/development/debugging/` for troubleshooting guides

## Agent Workflows

For AI agents working on this codebase:

### Available Agent Resources

**Prompt Templates** ([docs/development/agent-resources/prompts/](../docs/development/agent-resources/prompts/)):
- **Frontend Implementation Prompt**: For new React components/pages
- **User Flow Prompt**: For multi-step user workflows
- **End-to-End Flow Prompt**: For admin-user interaction flows

**Handoff Documents** ([docs/development/agent-resources/handoffs/](../docs/development/agent-resources/handoffs/)):
- **AGENT_HANDOFF.md**: Current project state and next steps
- **AI_HANDOFF.md**: Comprehensive context for AI agents
- **MATERIAL_UI_MIGRATION_HANDOFF_GUIDE.md**: MUI migration guidance
- Feature-specific handoffs (Copy Trading, Long-Term Wallets, etc.)

### Agent Workflow Process

1. **Context Gathering**: Review relevant prompt template and documentation
2. **Clarifying Questions**: Ask one at a time to understand requirements
3. **Implementation**: Follow patterns from similar code
4. **Testing**: Run linters, builds, and tests early and often
5. **Documentation**: Update relevant docs with changes
6. **Handoff**: Create or update handoff document if needed

### Best Practices for Agents

- Always review [docs/index.md](../docs/index.md) first for navigation
- Use prompt templates in [docs/development/agent-resources/prompts/](../docs/development/agent-resources/prompts/)
- Reference handoffs in [docs/development/agent-resources/handoffs/](../docs/development/agent-resources/handoffs/)
- Make minimal changes - surgical fixes only
- Test early and often
- Keep documentation synchronized with code
