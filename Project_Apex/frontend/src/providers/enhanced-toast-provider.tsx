import { createContext, useContext, ReactNode } from 'react';
import { ToastContainer, toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useScreenReaderAnnouncement } from '@/utils/accessibility';

interface ToastContextType {
  // Existing ToastProvider API (for backward compatibility)
  addToast: (toast: { message: string; type: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Convenience hooks (maintain existing API)
  useToastSuccess: () => (message: string, duration?: number) => void;
  useToastError: () => (message: string, duration?: number) => void;
  useToastWarning: () => (message: string, duration?: number) => void;
  useToastInfo: () => (message: string, duration?: number) => void;
  
  // Direct react-toastify access
  toast: typeof toast;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Default toast configuration
const defaultToastConfig: ToastOptions = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "light",
};

interface EnhancedToastProviderProps {
  children: ReactNode;
}

export const EnhancedToastProvider = ({ children }: EnhancedToastProviderProps) => {
  const announce = useScreenReaderAnnouncement();

  // Enhanced addToast that uses react-toastify
  const addToast = ({ message, type, duration }: { 
    message: string; 
    type: 'success' | 'error' | 'warning' | 'info'; 
    duration?: number 
  }) => {
    const toastOptions: ToastOptions = {
      ...defaultToastConfig,
      autoClose: duration || defaultToastConfig.autoClose,
    };

    // Use react-toastify for actual display
    switch (type) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toast.warning(message, toastOptions);
        break;
      case 'info':
        toast.info(message, toastOptions);
        break;
    }

    // Maintain accessibility announcements
    const typeText = type === 'success' ? 'Success' : 
                    type === 'error' ? 'Error' : 
                    type === 'warning' ? 'Warning' : 'Info';
    announce(`${typeText}: ${message}`, type === 'error' ? 'assertive' : 'polite');
  };

  // Stub implementations for backward compatibility
  const removeToast = () => {
    // react-toastify handles removal automatically
  };

  const clearToasts = () => {
    toast.dismiss();
  };

  // Convenience hooks
  const useToastSuccess = () => (message: string, duration?: number) => {
    addToast({ message, type: 'success', duration });
  };

  const useToastError = () => (message: string, duration?: number) => {
    addToast({ message, type: 'error', duration });
  };

  const useToastWarning = () => (message: string, duration?: number) => {
    addToast({ message, type: 'warning', duration });
  };

  const useToastInfo = () => (message: string, duration?: number) => {
    addToast({ message, type: 'info', duration });
  };

  const contextValue: ToastContextType = {
    addToast,
    removeToast,
    clearToasts,
    useToastSuccess,
    useToastError,
    useToastWarning,
    useToastInfo,
    toast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer {...defaultToastConfig} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within an EnhancedToastProvider');
  }
  return context;
};

// Export convenience hooks for direct usage
export { toast };