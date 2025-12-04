# Frontend Copilot Instructions - Supplementary

> **ℹ️ NOTE**: This file contains supplementary frontend information.  
> **Primary instructions**: See [copilot-instructions.md](./copilot-instructions.md) for main instructions.  
> **Complete frontend docs**: See [docs/frontend/](../docs/frontend/) for comprehensive frontend documentation.

## Quick Reference

This document provides a quick overview. For detailed information:
- **[Frontend Development Guide](../docs/frontend/frontend-development-guide.md)** - Comprehensive guide
- **[MUI Migration Status](../docs/frontend/MUI_MIGRATION_STATUS.md)** - 90% complete
- **[MUI Quick Reference](../docs/frontend/MUI_QUICK_REFERENCE.md)** - Component patterns
- **[Dashboard Implementation](../docs/frontend/dashboards-implementation-guide.md)** - Dashboard guide

## Project Overview
This is a modern React frontend built with Vite, designed to complement a FastAPI backend. The frontend features a comprehensive design system with **Material UI components**, **TailwindCSS** for utility styling, and **React Router** for navigation.

## Architecture Overview

### Tech Stack
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7.x with SWC compiler
- **UI Framework**: Material UI 7.x with Emotion
- **Styling**: Material UI's styled system with TailwindCSS 4.x for utilities
- **Routing**: React Router 7.x (browser routing)
- **Icons**: Material UI Icons library
- **Animations**: Motion (Framer Motion successor)
- **Development**: TypeScript ESLint, Prettier with sort imports

### Project Structure
```
frontend/
├── src/
│   ├── components/          # Component library organized by type
│   │   ├── base/           # Core UI primitives (buttons, inputs, etc.)
│   │   ├── foundations/    # Logo, icons, basic elements
│   │   ├── application/    # Complex app components (tables, modals)
│   │   ├── marketing/      # Marketing/landing page components
│   │   └── shared-assets/  # Shared resources
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components (using Material UI)
│   ├── providers/          # Context providers (theme, router, Material UI theme)
│   ├── styles/             # Global CSS and theme definitions
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── public/                 # Static assets
├── scripts/                # Build and deployment scripts
└── package.json           # Dependencies and scripts
```

## Component Architecture

### Component Organization
Components are organized into logical categories:

- **`base/`**: Fundamental UI components (buttons, inputs, forms, etc.) - **Migrating to Material UI**
- **`foundations/`**: Basic building blocks (logo, icons, ratings) - **Migrating to Material UI**
- **`application/`**: Complex application components (tables, modals, navigation) - **Using Material UI**
- **`marketing/`**: Landing page and marketing-focused components
- **`shared-assets/`**: Shared resources and assets

### Design System Pattern
Follow Material UI patterns with TypeScript:
```tsx
// Import structure - Use Material UI components
import { Button, Typography, Box } from "@mui/material";
import { TrendingUp } from "@mui/icons-material";

// Component definition with TypeScript
interface ComponentProps {
  // Define props with proper types
}

export const Component = ({ prop }: ComponentProps) => {
  // Component logic
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">Component Title</Typography>
      <Button variant="contained" startIcon={<TrendingUp />}>
        Action
      </Button>
    </Box>
  );
};
```

### Styling Conventions
- **Primary**: Use Material UI's `sx` prop for component-specific styles
- **Secondary**: Use TailwindCSS utility classes for layout and spacing
- **Avoid**: Inline CSS and complex TailwindCSS class combinations
- Use Material UI theme for consistent colors, typography, and spacing
- Follow responsive design patterns with Material UI breakpoints

## Development Patterns

### Routing
The app uses React Router with Material UI integration:
```tsx
// In main.tsx - Note MaterialThemeProvider wrapper
<MaterialThemeProvider>
  <BrowserRouter>
    <RouteProvider>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </RouteProvider>
  </BrowserRouter>
</MaterialThemeProvider>
```

To add new routes:
1. Create page component in `src/pages/` using Material UI components
2. Add route to the Routes component in `main.tsx`
3. Use React Router hooks for navigation with Material UI Link components

### State Management
- Use React's built-in state management (useState, useContext)
- Theme management via Material UI ThemeProvider
- Router integration via RouteProvider wrapper

### Custom Hooks
Located in `src/hooks/`, including:
- `use-clipboard.ts`: Clipboard operations with fallback
- `use-breakpoint.ts`: Responsive breakpoint detection using Material UI breakpoints
- `use-resize-observer.ts`: Element resize observation

### Theme System
- Light/dark/system theme support via Material UI ThemeProvider
- Theme persistence in localStorage
- Material UI theme object for consistent styling
- Theme toggle functionality built-in using Material UI's theme switching

## API Integration

### Client Generation
The project includes scripts for generating API clients from the FastAPI backend:
- Run `frontend/scripts/generate-client.sh` to generate TypeScript client
- Generated client will be placed in `src/client/` directory
- Auto-formats generated code with Biome

### API Configuration
Configure API base URL via environment variables:
- `VITE_API_URL`: API base URL for frontend requests
- Set in Docker build args or `.env` file

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality
- **Linting**: TypeScript ESLint with strict configuration
- **Formatting**: Prettier with import sorting plugin
- **Type Checking**: Strict TypeScript configuration

### Docker Development
- Multi-stage Dockerfile for production builds
- Nginx serving optimized for SPA routing
- Environment variable injection at build time

## UI Component Guidelines

### Base Components
When creating base components:
- **Use Material UI components** instead of custom base components
- Follow Material UI prop patterns and naming conventions
- Include proper TypeScript interfaces
- Use Material UI's `sx` prop for component-specific styling

### Application Components
For complex application components:
- Compose from Material UI components
- Include proper loading and error states using Material UI components
- Support responsive design patterns using Material UI breakpoints
- Include comprehensive prop documentation

### Styling Best Practices
- **Primary**: Use Material UI's `sx` prop for component-specific styles
- **Secondary**: Use TailwindCSS utility classes for layout and spacing
- **Avoid**: Inline CSS and complex TailwindCSS class combinations
- Use Material UI theme for consistent colors, typography, and spacing

## Material UI Migration Guide

### Component Mapping
Replace Untitled UI components with Material UI equivalents:

| Untitled UI Component | Material UI Equivalent |
|----------------------|----------------------|
| Custom Button | `Button` from `@mui/material` |
| Custom Badge | `Chip` from `@mui/material` |
| Custom Input | `TextField` from `@mui/material` |
| Custom Card | `Card` from `@mui/material` |
| Custom Modal | `Dialog` from `@mui/material` |
| Custom Table | `Table` from `@mui/material` |

### Styling Migration
Replace complex TailwindCSS with Material UI's `sx` prop:

```tsx
// ❌ Old pattern (complex TailwindCSS)
<div className="flex flex-col md:flex-row lg:gap-8 p-4 bg-white rounded-lg shadow-md">

// ✅ New pattern (Material UI sx prop)
<Box sx={{
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  gap: { lg: 2 },
  p: 2,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 1
}}>
```

### Theme Integration
Use Material UI theme tokens instead of CSS custom properties:

```tsx
// ❌ Old pattern (CSS custom properties)
<div style={{ color: 'var(--color-text-primary)' }}>

// ✅ New pattern (Material UI theme)
<Typography color="text.primary">
```

## Testing Strategy

### Component Testing
- Test components in isolation
- Focus on user interactions and accessibility
- Use proper semantic queries
- Test responsive behavior with Material UI breakpoints

### Integration Testing
- Test page-level components
- Verify routing behavior
- Test theme switching functionality
- Validate API integration points

## Deployment Patterns

### Build Configuration
- Vite optimizations for production builds
- Asset optimization and code splitting
- Environment variable injection
- Source map generation for debugging

### Docker Deployment
- Multi-stage build for minimal production image
- Nginx configuration for SPA routing
- Health check endpoints
- Proper asset caching headers

## Adding New Features

### Adding a New Page
1. Create component in `src/pages/new-page.tsx` using Material UI
2. Add route to main routing configuration
3. Update navigation components if needed using Material UI components
4. Add any required API integration

### Adding New Components
1. **Use Material UI components directly** instead of creating custom base components
2. Create component with proper TypeScript interfaces
3. Use Material UI's `sx` prop for styling
4. Include proper accessibility attributes (built into Material UI)
5. Add to appropriate barrel exports if needed

### Adding API Integration
1. Update backend API endpoints
2. Run client generation script
3. Create hooks for data fetching
4. Implement proper error handling with Material UI feedback
5. Add loading states and optimistic updates

## Performance Considerations

- Use React.memo for expensive components
- Implement proper code splitting for routes
- Optimize images and assets
- Use proper caching strategies
- Monitor bundle size with Vite's built-in analyzer
- Leverage Material UI's tree-shaking capabilities

## Accessibility Standards

- **Material UI components include built-in accessibility**
- Maintain proper semantic HTML structure
- Include ARIA labels and descriptions when needed
- Test with keyboard navigation
- Ensure proper color contrast ratios (handled by Material UI theme)
- Support screen readers

## Common Patterns to Follow

### Error Handling with Material UI
```tsx
const [error, setError] = useState<string | null>(null);

try {
  // API call or operation
} catch (err) {
  setError(err instanceof Error ? err.message : 'An error occurred');
}

// Display error with Material UI
{error && (
  <Alert severity="error" onClose={() => setError(null)}>
    {error}
  </Alert>
)}
```

### Loading States with Material UI
```tsx
const [isLoading, setIsLoading] = useState(false);

// Use loading state in UI with Material UI
{isLoading ? <CircularProgress /> : <Content />}

// Or use Button loading state
<Button loading={isLoading}>Submit</Button>
```

### Responsive Design with Material UI
```tsx
// Use Material UI breakpoints in sx prop
<Box sx={{
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  gap: { xs: 2, md: 3 }
}}>
  {/* Responsive content */}
</Box>
```

### Eliminating Inline CSS
```tsx
// ❌ Avoid inline styles
<div style={{ padding: '16px', backgroundColor: '#fff' }}>

// ✅ Use Material UI sx prop
<Box sx={{ p: 2, bgcolor: 'background.paper' }}>

// ✅ Or use TailwindCSS for simple utilities
<div className="p-4 bg-white">
```

This frontend is designed to be a modern, accessible, and maintainable React application that integrates seamlessly with the FastAPI backend while providing a rich user experience through the **Material UI design system**.