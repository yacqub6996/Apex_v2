import { type ReactNode, memo, useMemo } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Divider,
  LinearProgress,
  type SxProps,
  type Theme,
} from "@mui/material";

export interface PanelProps {
  /**
   * Panel content
   */
  children: ReactNode;

  /**
   * Optional title for the panel (can be string or ReactNode)
   */
  title?: ReactNode;

  /**
   * Optional subtitle or description
   */
  subtitle?: string;

  /**
   * Optional action buttons/elements to display in the header
   */
  actions?: ReactNode;

  /**
   * Optional footer content
   */
  footer?: ReactNode;

  /**
   * Paper elevation (0 for flat, outlined style recommended)
   */
  elevation?: number;

  /**
   * Paper variant
   */
  variant?: "elevation" | "outlined";

  /**
   * Additional sx props for the Paper
   */
  sx?: SxProps<Theme>;

  /**
   * Padding inside the panel (theme spacing multiplier or responsive object)
   */
  padding?: number | { xs: number; md: number };

  /**
   * Show loading indicator at the top of the panel
   */
  loading?: boolean;
}

/**
 * Panel - A reusable container component for grouping content
 * 
 * This component provides consistent styling for content panels/sections.
 * It can optionally include a header with title and actions, and a footer.
 * 
 * Example usage:
 * ```tsx
 * <Panel
 *   title="User Profile"
 *   subtitle="Manage your personal information"
 *   actions={<Button>Edit</Button>}
 *   loading={isLoading}
 * >
 *   <Stack spacing={2}>
 *     <TextField label="Name" value={name} />
 *     <TextField label="Email" value={email} />
 *   </Stack>
 * </Panel>
 * ```
 */
export const Panel = memo(({
  children,
  title,
  subtitle,
  actions,
  footer,
  elevation = 0,
  sx,
  padding = { xs: 1.5, md: 2.5 },
  loading = false,
}: PanelProps) => {
  const hasHeader = Boolean(title || subtitle || actions);
  
  // Memoize padding calculations to avoid recalculating on every render
  const { mainPadding, headerBottomPadding, footerTopPadding } = useMemo(() => {
    if (typeof padding === 'number') {
      return {
        mainPadding: padding,
        headerBottomPadding: padding / 2,
        footerTopPadding: padding / 2,
      };
    }
    return {
      mainPadding: padding,
      headerBottomPadding: { xs: padding.xs / 2, md: padding.md / 2 },
      footerTopPadding: { xs: padding.xs / 2, md: padding.md / 2 },
    };
  }, [padding]);

  return (
    <Paper
      elevation={elevation}
      variant="elevation"
      sx={{
        borderRadius: '12px', // C1 precise geometry
        overflow: "hidden",
        border: "none",
        boxShadow: (theme) => theme.shadows[1], // shadows.low
        transition: "box-shadow 0.12s ease-in-out",
        '&:hover': {
            boxShadow: (theme) => theme.shadows[2], // shadows.medium on hover
        },
        ...sx,
      }}
    >
      {loading && (
        <LinearProgress 
          sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
          }}
          aria-label="Loading content"
        />
      )}
      
      {hasHeader && (
        <>
          <Box
            sx={{
              p: mainPadding,
              pb: headerBottomPadding,
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent={{ xs: "flex-start", sm: "space-between" }}
              spacing={{ xs: 1, sm: 2 }}
            >
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                {title && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: subtitle ? 0.75 : 0,
                    }}
                  >
                    {typeof title === 'string' ? (
                      <Typography
                        variant="subtitle1"
                        component="h2"
                        sx={{ fontWeight: 600 }}
                      >
                        {title}
                      </Typography>
                    ) : (
                      title
                    )}
                  </Box>
                )}
                {subtitle && (
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
              {actions && (
                <Box
                  sx={{
                    flexShrink: 0,
                    width: { xs: "100%", sm: "auto" },
                    display: "flex",
                    justifyContent: { xs: "flex-start", sm: "flex-end" },
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  {actions}
                </Box>
              )}
            </Stack>
          </Box>
          <Divider sx={{ opacity: 0.6 }} />
        </>
      )}

      <Box sx={{ p: mainPadding }}>{children}</Box>

      {footer && (
        <>
          <Divider sx={{ opacity: 0.6 }} />
          <Box sx={{ 
            p: mainPadding, 
            pt: footerTopPadding,
          }}>
            {footer}
          </Box>
        </>
      )}
    </Paper>
  );
});

Panel.displayName = "Panel";
