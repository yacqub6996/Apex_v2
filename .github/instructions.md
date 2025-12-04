# instructions.md

> **⚠️ DEPRECATED AND HISTORICAL**: This file contains outdated information about Untitled UI.  
> The project has fully migrated to Material UI (90% complete).  
> 
> **DO NOT USE THIS FILE FOR NEW WORK**  
> 
> **Current instructions**: See [copilot-instructions.md](./copilot-instructions.md)  
> **Frontend documentation**: See [docs/frontend/](../docs/frontend/)  
> **MUI Quick Reference**: See [docs/frontend/MUI_QUICK_REFERENCE.md](../docs/frontend/MUI_QUICK_REFERENCE.md)

## Executive Principles

**North Stars:** Maintainability, accessibility, consistency with Untitled UI design system, least power principle, minimal surface area.

**Golden Rule:** Do not introduce custom components or third-party UI libraries when a functionally equivalent Untitled UI component exists. If a real gap blocks progress, submit an RFC first using the template in this document.

**Component Hierarchy:** Base primitives → Application composites → Marketing components → Page assemblies. Always compose up this hierarchy, never bypass it.

## Stack Snapshot

- **React 19.1.1** + TypeScript + Vite 7.1.1 (SWC)
- **React Router v7** for client routing
- **Untitled UI** (React Aria Components foundation)
- **Tailwind CSS 4.1.11** with custom design tokens
- **Motion 12.23.12** for animations
- **No state management library** (React Context/useState only)
- **No form/validation library** (native patterns)
- **No data fetching library** (manual fetch patterns)
- Prettier + ESLint with import sorting and Tailwind plugins

## Folder Structure and Conventions

```text
src/
├── components/
│   ├── base/           # Primitive UI components (Button, Input, Modal)
│   ├── application/    # Composite app components (Table, Pagination, Tabs)  
│   ├── marketing/      # Marketing-specific compositions
│   ├── foundations/    # Logos, icons, brand elements
│   └── shared-assets/  # Cross-cutting composed components
├── pages/              # Route-level page components
├── providers/          # React Context providers (theme, router)
├── hooks/              # Custom React hooks
├── utils/              # Pure utility functions
├── styles/             # Global CSS, theme tokens
└── types/              # TypeScript type definitions
```

**Naming:** Use kebab-case for files/folders. Components use PascalCase exports.

**Imports:** Path alias `@/*` for src imports. Prettier enforces import ordering: React → external → internal → relative.

**Barrel files:** Use index.ts sparingly. Prefer explicit imports for better tree-shaking.

## UI System and Theming

### Component Import Paths

```tsx
import { Button } from "@/components/base/buttons/button";
import { Table } from "@/components/application/table/table";
import { Modal } from "@/components/application/modals/modal";
```

### Theme Tokens

Defined in `src/styles/theme.css` with CSS custom properties:

- Colors: `--color-brand-primary`, `--color-secondary`, etc.
- Spacing: `--spacing` base unit (4px)
- Typography: `--text-sm`, `--text-display-lg`, etc.
- Radius: `--radius-lg`, `--radius-full`

### Color Usage

```tsx
// Use semantic classes, not arbitrary values
<div className="bg-primary text-secondary">
<Button color="primary">  // not className="bg-blue-500"
```

### Dark Mode

Handled via ThemeProvider context. Use `dark:` prefix for dark-specific styles.

### Icons

From `@untitledui/icons`. Always destructure imports:

```tsx
import { ArrowRight, Settings } from "@untitledui/icons";
```

## Components: Primitives → Composites

### Available Base Primitives

- **Button:** `color`, `size`, `href`, `disabled`, loading states
- **Input:** Labels, validation, help text, prefix/suffix
- **Select:** Single/multi, searchable, async loading
- **Modal/Dialog:** Focus traps, keyboard handling, backdrop
- **Checkbox/Radio:** Controlled/uncontrolled, validation
- **Badge:** Colors, sizes, removable variants
- **Avatar:** Initials, images, status indicators
- **Tooltip:** Positioning, delays, rich content

### Composition Patterns

```tsx
// Good: Compose existing primitives
const SearchModal = () => (
  <Modal>
    <Dialog>
      <Input placeholder="Search..." />
      <Table data={results} />
    </Dialog>
  </Modal>
);

// Bad: Custom modal from scratch
const CustomModal = () => <div className="modal">...</div>;
```

### Props Conventions

- Use `aria-label` for accessibility
- Include `disabled` prop handling
- Support `className` for style extension
- Use controlled props (`value`/`onChange`) for form inputs

## Forms and Validation

**Current Pattern:** Native form handling with FormData

```tsx
const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget));
  // Handle submission
};

<form onSubmit={handleSubmit}>
  <Input name="email" type="email" required />
  <Button type="submit">Submit</Button>
</form>
```

**Gap:** No form library or validation. Consider react-hook-form + zod if complex forms become frequent.

### Async Submit Pattern

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e) => {
  setIsSubmitting(true);
  try {
    await submitData(formData);
  } finally {
    setIsSubmitting(false);
  }
};
```

## Data Fetching and State

**Current Pattern:** Manual fetch with useState/useEffect

```tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/data')
    .then(res => res.json())
    .then(setData)
    .finally(() => setLoading(false));
}, []);
```

**Gap:** No data fetching library. Consider @tanstack/react-query for complex data needs.

### State Management Rules

- Local component state: `useState`
- Cross-component state: React Context (see ThemeProvider example)
- No global state library currently used

## Routing and Navigation

**Pattern:** React Router v7 with component-based routes

```tsx
// main.tsx
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/home" element={<HomeScreen />} />
</Routes>
```

**Navigation:**

```tsx
import { useNavigate } from "react-router";

const navigate = useNavigate();
navigate("/path");
navigate(-1); // Go back
```

**Code Splitting:** Not currently implemented. Consider React.lazy() for large pages.

## Accessibility

### Required Patterns

- **Focus management:** Modals must trap focus and restore on close
- **Keyboard navigation:** All interactive elements accessible via Tab/Enter/Space
- **ARIA attributes:** `aria-label`, `aria-describedby`, `role` where semantic HTML insufficient
- **Screen reader support:** Use semantic HTML first, ARIA as enhancement

### Accessibility Checklist

```tsx
// Good
<Button aria-label="Close dialog">×</Button>
<Input aria-describedby="help-text" />
<span id="help-text">Password must be 8 characters</span>

// Good: Semantic HTML
<nav>, <main>, <section>, <h1>-<h6>

// Test with:
// - Tab navigation only
// - Screen reader (NVDA/JAWS)
// - `reduced-motion` preference
```

## Performance Guidelines

### Component Boundaries

- Keep components focused on single responsibility
- Use React.memo() for expensive pure components
- Avoid creating objects/functions in render (use useCallback/useMemo)

### List Rendering

```tsx
// Good: Key optimization
{items.map(item => <Item key={item.id} data={item} />)}

// Consider virtualization for 100+ items
```

### Code Splitting

```tsx
// Route-level splitting
const LazyPage = lazy(() => import("@/pages/heavy-page"));

// Component-level for large features
const Chart = lazy(() => import("@/components/charts/chart"));
```

## Security and Auth UX

**Gap:** No authentication implementation detected.

**When implementing:**

- Store tokens in httpOnly cookies, not localStorage
- Handle token refresh transparently
- Show clear loading states during auth checks
- Provide meaningful error messages for auth failures

## Testing and QA

**Gap:** No testing framework detected.

**Recommended setup:**

- Vitest for unit tests
- Testing Library for component tests  
- Playwright for E2E (already in package.json)

### Accessibility Testing

```bash
# Add axe-core for automated a11y testing
npm install @axe-core/react
```

## Git, CI, and Reviews

### Commit Messages

Follow conventional commits:

```text
feat: add search modal component
fix: resolve focus trap in dialog
docs: update component usage guide
```

### PR Checklist

- [ ] No custom components when Untitled UI equivalent exists
- [ ] Accessibility tested (keyboard + screen reader)
- [ ] TypeScript strict mode passes
- [ ] Prettier/ESLint clean
- [ ] No new external dependencies without RFC

## "No Custom Code" Policy and RFC Template

**Policy:** Use Untitled UI components first. Custom code requires RFC approval.

### RFC Template

```markdown
## Problem Statement
What specific use case is blocked?

## Why Untitled UI is Insufficient  
What's missing from existing components?

## Proposed Approach
Minimal implementation plan

## Accessibility Impact
How will this maintain a11y standards?

## Performance Impact  
Bundle size, runtime performance considerations

## Migration Plan
How to adopt without breaking changes

## Rollback Plan
How to revert if issues arise
```

## Do and Don't

### Do

✅ Use Untitled UI primitives as building blocks  
✅ Compose components rather than customize  
✅ Use design tokens instead of arbitrary values  
✅ Include aria-labels and semantic HTML  
✅ Keep component props minimal and focused  
✅ Use TypeScript strict mode  
✅ Choose appropriate components for user context (admin vs user dashboards)  
✅ Use `ProgressBarBase` for completion indicators  
✅ Use `BadgeWithIcon` for metric trends and status changes  
✅ Implement proper tab navigation with `Tabs.Panel` structure  

### Don't  

❌ Add overlapping UI libraries (Ant Design, Chakra, etc.)  
❌ Inline complex CSS when tokens exist  
❌ Skip accessibility props on interactive elements  
❌ Use admin-level components in user-facing interfaces  
❌ Mix `Badge` and `BadgeWithIcon` inconsistently  
❌ Use deprecated API patterns (e.g., `Table.Column` → use `Table.Head`)  
❌ Create one-off patterns without considering reuse  
❌ Bypass the base → application → page hierarchy  

## Examples

### 1. Form with Validation

```tsx
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

const LoginForm = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!data.email) newErrors.email = "Email is required";
    if (!data.password) newErrors.password = "Password is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit logic
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="email"
        type="email"
        label="Email"
        error={errors.email}
        aria-describedby={errors.email ? "email-error" : undefined}
      />
      {errors.email && (
        <div id="email-error" className="text-sm text-error">
          {errors.email}
        </div>
      )}
      
      <Input
        name="password"
        type="password"
        label="Password"
        error={errors.password}
      />
      
      <Button type="submit" color="primary" size="lg">
        Sign In
      </Button>
    </form>
  );
};
```

### 2. Data Table with Pagination

```tsx
import { Table } from "@/components/application/table/table";
import { Pagination } from "@/components/application/pagination/pagination";

const UserTable = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-4">
      <Table>
        <Table.Header>
          <Table.Column>Name</Table.Column>
          <Table.Column>Email</Table.Column>
          <Table.Column>Role</Table.Column>
        </Table.Header>
        <Table.Body items={users} isLoading={loading}>
          {(user) => (
            <Table.Row key={user.id}>
              <Table.Cell>{user.name}</Table.Cell>
              <Table.Cell>{user.email}</Table.Cell>
              <Table.Cell>{user.role}</Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
      
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(users.length / 10)}
        onPageChange={setPage}
      />
    </div>
  );
};
```

### 3. Modal with Focus Management

```tsx
import { Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onClose}>
      <Modal>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-primary">
            Confirm Delete
          </h2>
          <p className="mt-2 text-secondary">
            This action cannot be undone.
          </p>
          <div className="mt-6 flex gap-3 justify-end">
            <Button color="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button color="primary-destructive" onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </ModalOverlay>
  );
};
```

## Dashboard Implementation Examples

This project includes two types of dashboards showcasing different component usage patterns and user contexts.

### Admin Dashboard (`/admin/dashboard`)

A business-focused dashboard with administrative features:

```tsx
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { Table } from "@/components/application/table/table";
import { Tabs } from "@/components/application/tabs/tabs";

// Features business metrics, user management, system analytics
const AdminDashboard = () => {
  const statCards = [
    {
      title: "Total Revenue",
      value: "$45,231.89",
      changeType: "positive",
      icon: CurrencyDollar
    }
    // ... more business metrics
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Business metrics with trend indicators */}
      <BadgeWithIcon
        type="color"
        color="success"
        iconLeading={TrendUp01}
      >
        +20.1%
      </BadgeWithIcon>

      {/* Advanced data tables for user management */}
      <Table size="sm">
        <Table.Header>
          <Table.Head>User</Table.Head>
          <Table.Head>Action</Table.Head>
        </Table.Header>
        <Table.Body items={activities}>
          {(activity) => (
            <Table.Row key={activity.id}>
              <Table.Cell>{activity.user}</Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </div>
  );
};
```

### User Dashboard (`/dashboard`)

A personal dashboard focused on user experience:

```tsx
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { Badge } from "@/components/base/badges/badges";
import { Avatar } from "@/components/base/avatar/avatar";

// Features personal stats, profile management, activity feed
const UserDashboard = () => {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Profile completion with progress indicator */}
      <div className="rounded-lg border p-6">
        <ProgressBarBase value={85} className="h-2" />
        <p className="text-sm text-fg-tertiary">
          Complete your profile to unlock rewards
        </p>
      </div>

      {/* Personal activity timeline */}
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <Avatar size="xs" initials="JD" />
            <div>
              <p className="font-medium">{activity.title}</p>
              <Badge type="color" color="success" size="sm">
                {activity.type}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Key Differences in Component Usage

**Admin Dashboard Pattern:**

- `BadgeWithIcon` for trend indicators and metrics
- Complex `Table` components with management features
- System-level statistics and analytics
- Business-focused quick actions

**User Dashboard Pattern:**

- `ProgressBarBase` for personal goal tracking
- Simple `Badge` components for status indicators
- `Avatar` components in activity feeds
- User-focused personal actions

### Routing Structure

```tsx
// main.tsx
<Routes>
  <Route path="/dashboard" element={<UserDashboard />} />
  <Route path="/admin/dashboard" element={<AdminDashboard />} />
</Routes>
```

Both dashboards follow the component hierarchy (base → application → page) and demonstrate different approaches to composing the same primitive components for different user contexts.

## Appendix

### Key Files

- **Tailwind Config:** `src/styles/theme.css` (design tokens)
- **UI Primitives:** `src/components/base/`
- **Global Styles:** `src/styles/globals.css`
- **Route Setup:** `src/main.tsx`
- **Theme Provider:** `src/providers/theme-provider.tsx`
- **Type Definitions:** `src/types/`

### External Resources

- [React Aria Components Docs](https://react-spectrum.adobe.com/react-aria/components.html)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [Untitled UI Icons](https://www.untitledui.com/icons)
