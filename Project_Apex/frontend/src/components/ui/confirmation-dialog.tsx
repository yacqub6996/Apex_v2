import { useState, useCallback, ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useFocusTrap, useScreenReaderAnnouncement } from '@/utils/accessibility';

export type ConfirmationType = 'warning' | 'error' | 'info' | 'question';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  severity?: 'low' | 'medium' | 'high';
  loading?: boolean;
  destructive?: boolean;
}

export const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  severity = 'medium',
  loading = false,
  destructive = false,
}: ConfirmationDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useFocusTrap(open);
  const announce = useScreenReaderAnnouncement();

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <ErrorIcon fontSize="large" color="error" />;
      case 'warning':
        return <WarningIcon fontSize="large" color="warning" />;
      case 'info':
        return <InfoIcon fontSize="large" color="info" />;
      case 'question':
        return <HelpIcon fontSize="large" color="primary" />;
      default:
        return <WarningIcon fontSize="large" color="warning" />;
    }
  };

  const getColor = () => {
    if (destructive) return 'error';
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'primary';
      case 'question':
        return 'primary';
      default:
        return 'primary';
    }
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'warning';
    }
  };

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      await onConfirm();
      onClose();
      announce('Action completed successfully');
    } catch (error) {
      console.error('Confirmation action failed:', error);
      announce('Action failed', 'assertive');
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm, onClose, announce]);

  const handleClose = useCallback(() => {
    if (!isSubmitting && !loading) {
      onClose();
    }
  }, [isSubmitting, loading, onClose]);

  // Announce dialog opening to screen readers
  useState(() => {
    if (open) {
      announce(`${title} dialog opened. ${typeof message === 'string' ? message : 'Please review the information.'}`);
    }
  });

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      ref={modalRef as React.RefObject<HTMLDivElement>}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
      role="alertdialog"
    >
      <DialogTitle
        id="confirmation-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          pb: 1,
        }}
      >
        {getIcon()}
        <Typography variant="h6" component="span" fontWeight={600}>
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Severity Alert */}
          <Alert
            severity={getSeverityColor()}
            sx={{ borderRadius: 2 }}
            role="status"
          >
            {severity === 'high' && 'This action cannot be undone.'}
            {severity === 'medium' && 'This action may have significant consequences.'}
            {severity === 'low' && 'Please confirm this action.'}
          </Alert>

          {/* Message Content */}
          <Box id="confirmation-dialog-description">
            {typeof message === 'string' ? (
              <Typography variant="body1" color="text.primary">
                {message}
              </Typography>
            ) : (
              message
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={isSubmitting || loading}
          variant="outlined"
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            minWidth: 100,
          }}
          aria-label={cancelText}
        >
          {cancelText}
        </Button>
        
        <Button
          onClick={handleConfirm}
          disabled={isSubmitting || loading}
          variant="contained"
          color={getColor()}
          startIcon={isSubmitting || loading ? <CircularProgress size={16} /> : null}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            minWidth: 100,
          }}
          aria-label={confirmText}
          aria-busy={isSubmitting || loading}
        >
          {isSubmitting || loading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Hook for using confirmation dialogs
interface UseConfirmationOptions {
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  severity?: 'low' | 'medium' | 'high';
  destructive?: boolean;
}

export const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationConfig, setConfirmationConfig] = useState<UseConfirmationOptions | null>(null);
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => Promise<void> | void) | null>(null);
  const [loading, setLoading] = useState(false);

  const showConfirmation = useCallback((
    options: UseConfirmationOptions,
    onConfirm: () => Promise<void> | void
  ) => {
    setConfirmationConfig(options);
    setOnConfirmCallback(() => onConfirm);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (onConfirmCallback) {
      setLoading(true);
      try {
        await onConfirmCallback();
      } finally {
        setLoading(false);
        setIsOpen(false);
      }
    }
  }, [onConfirmCallback]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setConfirmationConfig(null);
    setOnConfirmCallback(null);
    setLoading(false);
  }, []);

  const ConfirmationDialogComponent = confirmationConfig ? (
    <ConfirmationDialog
      open={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={confirmationConfig.title}
      message={confirmationConfig.message}
      confirmText={confirmationConfig.confirmText}
      cancelText={confirmationConfig.cancelText}
      type={confirmationConfig.type}
      severity={confirmationConfig.severity}
      destructive={confirmationConfig.destructive}
      loading={loading}
    />
  ) : null;

  return {
    showConfirmation,
    ConfirmationDialog: ConfirmationDialogComponent,
  };
};

// Pre-configured confirmation hooks for common use cases
export const useDestructiveConfirmation = () => {
  const { showConfirmation, ConfirmationDialog } = useConfirmation();

  const showDestructiveConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => Promise<void> | void
  ) => {
    showConfirmation(
      {
        title,
        message,
        type: 'error',
        severity: 'high',
        destructive: true,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
      onConfirm
    );
  }, [showConfirmation]);

  return {
    showDestructiveConfirmation,
    DestructiveConfirmationDialog: ConfirmationDialog,
  };
};

export const useWarningConfirmation = () => {
  const { showConfirmation, ConfirmationDialog } = useConfirmation();

  const showWarningConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => Promise<void> | void
  ) => {
    showConfirmation(
      {
        title,
        message,
        type: 'warning',
        severity: 'medium',
        confirmText: 'Continue',
        cancelText: 'Cancel',
      },
      onConfirm
    );
  }, [showConfirmation]);

  return {
    showWarningConfirmation,
    WarningConfirmationDialog: ConfirmationDialog,
  };
};

export const useInfoConfirmation = () => {
  const { showConfirmation, ConfirmationDialog } = useConfirmation();

  const showInfoConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => Promise<void> | void
  ) => {
    showConfirmation(
      {
        title,
        message,
        type: 'info',
        severity: 'low',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
      },
      onConfirm
    );
  }, [showConfirmation]);

  return {
    showInfoConfirmation,
    InfoConfirmationDialog: ConfirmationDialog,
  };
};