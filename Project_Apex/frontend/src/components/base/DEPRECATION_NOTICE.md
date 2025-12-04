# Base Components Deprecation Notice

Components under `frontend/src/components/base/` are deprecated. Prefer Material UI components directly to avoid duplicate styling and maintenance.

## Use MUI Instead

- Buttons → `@mui/material/Button`
- Inputs/Textareas → `@mui/material/TextField`
- Dropdowns → `@mui/material/Select` or `Menu`
- Modals → `@mui/material/Dialog`
- Checkboxes → `@mui/material/Checkbox`

Example:

```tsx
// Deprecated
// import { Button } from '@/components/base/button/button'

// Recommended
import { Button } from '@mui/material'

<Button variant="contained">Action</Button>
```

All new code should rely on MUI. Migrate remaining usages when touched.
