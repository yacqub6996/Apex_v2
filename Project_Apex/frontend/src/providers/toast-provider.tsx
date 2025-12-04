import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor, Box } from '@mui/material';
import { useScreenReaderAnnouncement } from '@/utils/accessibility';

interface Toast {
  id: string;
  message: string;
  type: AlertColor;
  duration?: number;
  action?: ReactNode;
}

interface ToastState {
  toasts: Toast[];
}

type ToastAction =
  | { type: 'ADD_TOAST'; payload: Omit<Toast, 'id'> }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_TOASTS' };

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST': {
      const newToast: Toast = {
        ...action.payload,
        id: Math.random().toString(36).substr(2, 9),
      };
      return {
        ...state,
        toasts: [...state.toasts, newToast],
      };
    }
    
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload),
      };
    
    case 'CLEAR_TOASTS':
      return {
        ...state,
        toasts: [],
      };
    
    default:
      return state;
  }
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });
  const announce = useScreenReaderAnnouncement();

  const addToast = (toast: Omit<Toast, 'id'>) => {
    dispatch({ type: 'ADD_TOAST', payload: toast });
    
    // Announce to screen readers
    const typeText = toast.type === 'success' ? 'Success' : 
                    toast.type === 'error' ? 'Error' : 
                    toast.type === 'warning' ? 'Warning' : 'Info';
    announce(`${typeText}: ${toast.message}`, toast.type === 'error' ? 'assertive' : 'polite');
  };

  const removeToast = (id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  };

  const clearToasts = () => {
    dispatch({ type: 'CLEAR_TOASTS' });
  };

  const handleClose = (id: string) => {
    removeToast(id);
  };

  const contextValue: ToastContextType = {
    addToast,
    removeToast,
    clearToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <Box
        sx={{
          position: 'fixed',
          top: 80,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: 400,
          width: '100%',
        }}
      >
        {state.toasts.map((toast) => (
          <Snackbar
            key={toast.id}
            open={true}
            autoHideDuration={toast.duration || 6000}
            onClose={() => handleClose(toast.id)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{
              position: 'relative',
              transform: 'none',
              top: 'auto',
              right: 'auto',
              left: 'auto',
              bottom: 'auto',
            }}
          >
            <Alert
              severity={toast.type}
              onClose={() => handleClose(toast.id)}
              action={toast.action}
              sx={{
                width: '100%',
                borderRadius: 2,
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                '& .MuiAlert-message': {
                  flex: 1,
                },
              }}
              role="alert"
              aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            >
              {toast.message}
            </Alert>
          </Snackbar>
        ))}
      </Box>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Convenience hooks for specific toast types
export const useToastSuccess = () => {
  const { addToast } = useToast();
  
  return (message: string, duration?: number, action?: ReactNode) => {
    addToast({
      message,
      type: 'success',
      duration,
      action,
    });
  };
};

export const useToastError = () => {
  const { addToast } = useToast();
  
  return (message: string, duration?: number, action?: ReactNode) => {
    addToast({
      message,
      type: 'error',
      duration,
      action,
    });
  };
};

export const useToastWarning = () => {
  const { addToast } = useToast();
  
  return (message: string, duration?: number, action?: ReactNode) => {
    addToast({
      message,
      type: 'warning',
      duration,
      action,
    });
  };
};

export const useToastInfo = () => {
  const { addToast } = useToast();
  
  return (message: string, duration?: number, action?: ReactNode) => {
    addToast({
      message,
      type: 'info',
      duration,
      action,
    });
  };
};