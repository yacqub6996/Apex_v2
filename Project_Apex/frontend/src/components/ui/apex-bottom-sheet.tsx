import React from 'react';
import {
  Dialog,
  Box,
  useTheme,
  useMediaQuery,
  type DialogProps,
} from '@mui/material';
import { useModalSuppression } from '@/stores/support-widget-store';

export type ApexSheetVariant = 'bottom-sheet' | 'fullscreen';

export interface ApexBottomSheetProps extends Omit<DialogProps, 'fullScreen'> {
  /**
   * Presentation variant on mobile viewports (< 600px):
   * - 'bottom-sheet' (default): Anchored to bottom with 24px top rounded corners and max 90dvh.
   * - 'fullscreen': Dedicated full-screen takeover (100dvh) for complex multi-step wizards.
   * Desktop viewports (>= 600px) always render as conventional centered dialogs.
   */
  variant?: ApexSheetVariant;
  /**
   * Whether to show a visual drag handle pill on mobile bottom sheets. Defaults to true for 'bottom-sheet'.
   */
  showDragHandle?: boolean;
}

/**
 * ApexBottomSheet - Canonical responsive modal and sheet primitive for Project Apex.
 *
 * Responsiveness:
 * - Desktop (>= 600px): Centered dialog (maxWidth, rounded corners, centered elevation).
 * - Mobile (< 600px) Bottom Sheet: Docked to bottom, 24px top corners, max-height 90dvh.
 * - Mobile (< 600px) Fullscreen: Full-screen takeover (100dvh) for multi-step cashier wizards.
 *
 * Built-in capabilities:
 * - Automatically suppresses floating ambient widgets (FloatingSupportWidget) while open.
 * - Enforces single scroll ownership and flex column layout.
 */
export const ApexBottomSheet: React.FC<ApexBottomSheetProps> = ({
  open,
  onClose,
  variant = 'bottom-sheet',
  showDragHandle = true,
  maxWidth = 'sm',
  PaperProps,
  children,
  sx,
  ...rest
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Automatically suppress the floating chat FAB while this sheet is active
  useModalSuppression(open);

  const isFullscreenMobile = isMobile && variant === 'fullscreen';
  const isBottomSheetMobile = isMobile && variant === 'bottom-sheet';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={isFullscreenMobile}
      PaperProps={{
        ...PaperProps,
        sx: {
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // Mobile Fullscreen takeover
          ...(isFullscreenMobile && {
            m: 0,
            borderRadius: 0,
            height: '100dvh',
            maxHeight: '100dvh',
            width: '100%',
          }),
          // Mobile Anchored Bottom Sheet
          ...(isBottomSheetMobile && {
            m: 0,
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            maxWidth: '100%',
            borderRadius: '24px 24px 0 0',
            maxHeight: '90dvh',
          }),
          // Desktop / Tablet centered dialog
          ...(!isMobile && {
            borderRadius: 3,
            maxHeight: '90vh',
            m: 2,
          }),
          ...PaperProps?.sx,
        },
      }}
      sx={{
        ...(isBottomSheetMobile && {
          '& .MuiDialog-container': {
            alignItems: 'flex-end',
            justifyContent: 'center',
          },
        }),
        ...sx,
      }}
      {...rest}
    >
      {isBottomSheetMobile && showDragHandle && (
        <Box
          aria-hidden="true"
          sx={{
            width: 36,
            height: 4,
            bgcolor: 'divider',
            borderRadius: 2,
            mx: 'auto',
            mt: 1.25,
            mb: 0.25,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </Dialog>
  );
};
