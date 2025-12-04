import React from 'react';
import { Modal } from './modal';
import Button from '@mui/material/Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  isLoading = false,
}) => {
  const typeStyles = {
    danger: {
      icon: (
        <svg className="w-6 h-6 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      confirmColor: 'primary-destructive' as const,
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      confirmColor: 'secondary-destructive' as const,
    },
    info: {
      icon: (
        <svg className="w-6 h-6 text-info-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      confirmColor: 'primary' as const,
    },
    success: {
      icon: (
        <svg className="w-6 h-6 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      confirmColor: 'success' as const,
    },
  };

  const styles = typeStyles[type];
  const muiColor: "primary" | "secondary" | "success" | "info" | "warning" | "error" =
    type === "danger" ? "error" : type === "warning" ? "warning" : type === "success" ? "success" : "primary";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-bg-secondary mb-4">
          {styles.icon}
        </div>
        
        <h3 className="text-lg font-semibold text-fg-primary mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-fg-tertiary mb-6">
          {message}
        </p>
        
        <div className="flex gap-3 justify-center">
          <Button onClick={onClose} disabled={isLoading} variant="contained" aria-busy={isLoading}>
            {cancelText}
          </Button>
          <Button color={muiColor} onClick={onConfirm} disabled={isLoading} aria-busy={isLoading} variant="contained">
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

