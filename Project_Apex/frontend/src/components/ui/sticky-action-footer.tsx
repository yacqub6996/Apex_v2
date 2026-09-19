import React from 'react';
import { Box, Button, CircularProgress, useTheme, useMediaQuery, type SxProps, type Theme } from '@mui/material';

export interface ActionConfig {
  label: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  form?: string;
  disabled?: boolean;
  loading?: boolean;
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'info' | 'warning' | 'inherit';
  variant?: 'contained' | 'outlined' | 'text';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export interface StickyActionFooterProps {
  primaryAction?: ActionConfig;
  secondaryAction?: ActionConfig;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * StickyActionFooter - Reusable thumb-zone anchored footer for modals, bottom sheets, and forms.
 *
 * Guarantees:
 * - Persistent docking outside scrollable content areas.
 * - Minimum 48px touch targets for WCAG 2.2 AA compliance.
 * - Safe-area inset handling via env(safe-area-inset-bottom).
 * - Full-width stacked buttons on mobile (column-reverse for thumb reachability), row on desktop.
 */
export const StickyActionFooter: React.FC<StickyActionFooterProps> = ({
  primaryAction,
  secondaryAction,
  children,
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      component="footer"
      data-testid="sticky-action-footer"
      sx={{
        flexShrink: 0,
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, sm: 2 },
        pb: { xs: 'max(16px, env(safe-area-inset-bottom, 0px))', sm: 2 },
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: { xs: 'column-reverse', sm: 'row' },
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        ...sx,
      }}
    >
      {secondaryAction && (
        <Button
          type={secondaryAction.type || 'button'}
          form={secondaryAction.form}
          variant={secondaryAction.variant || 'outlined'}
          color={secondaryAction.color || 'inherit'}
          onClick={secondaryAction.onClick}
          disabled={secondaryAction.disabled || secondaryAction.loading}
          fullWidth={isMobile}
          startIcon={secondaryAction.startIcon}
          endIcon={secondaryAction.endIcon}
          sx={{
            minHeight: 48,
            minWidth: { sm: 100 },
            fontWeight: 500,
          }}
        >
          {secondaryAction.loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            secondaryAction.label
          )}
        </Button>
      )}

      {primaryAction && (
        <Button
          type={primaryAction.type || 'button'}
          form={primaryAction.form}
          variant={primaryAction.variant || 'contained'}
          color={primaryAction.color || 'primary'}
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled || primaryAction.loading}
          fullWidth={isMobile}
          startIcon={primaryAction.startIcon}
          endIcon={primaryAction.endIcon}
          sx={{
            minHeight: 48,
            minWidth: { sm: 160 },
            fontWeight: 600,
          }}
        >
          {primaryAction.loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            primaryAction.label
          )}
        </Button>
      )}

      {children}
    </Box>
  );
};
