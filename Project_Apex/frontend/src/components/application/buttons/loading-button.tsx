import React from 'react';
import Button, { ButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export interface LoadingButtonProps extends Omit<ButtonProps, 'loading'> {
  /** Shows a loading spinner and disables the button */
  loading?: boolean;
  /** When true, keeps the text visible during loading state */
  showTextWhileLoading?: boolean;
  /** Icon component or element to show before the text */
  startIcon?: React.ReactNode;
  /** Icon component or element to show after the text */
  endIcon?: React.ReactNode;
}

/**
 * LoadingButton Component
 * 
 * A Material UI Button wrapper that provides loading state functionality
 * with a circular progress indicator.
 * 
 * This component preserves the loading functionality from the original custom buttons
 * while using Material UI components.
 */
export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  showTextWhileLoading = false,
  children,
  disabled,
  startIcon,
  endIcon,
  ...buttonProps
}) => {
  // Determine which icon to show based on loading state
  const getStartIcon = () => {
    if (loading && !showTextWhileLoading) {
      return <CircularProgress size={16} color="inherit" />;
    }
    return startIcon;
  };

  const getEndIcon = () => {
    if (loading && showTextWhileLoading) {
      return <CircularProgress size={16} color="inherit" />;
    }
    return endIcon;
  };

  // Determine button content based on loading state
  const getButtonContent = () => {
    if (loading && !showTextWhileLoading) {
      return null; // Hide text when loading without showTextWhileLoading
    }
    return children;
  };

  return (
    <Button
      {...buttonProps}
      disabled={disabled || loading}
      startIcon={getStartIcon()}
      endIcon={getEndIcon()}
      sx={{
        position: 'relative',
        ...buttonProps.sx,
      }}
    >
      {getButtonContent()}
    </Button>
  );
};

export default LoadingButton;