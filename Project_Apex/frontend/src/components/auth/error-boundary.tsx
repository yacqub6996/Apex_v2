import { Component, ErrorInfo, ReactNode } from 'react';
import Button from '@mui/material/Button';
import { useAuth } from '@/providers/auth-provider';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AuthErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
    
    // Check if it's an authentication error
    if (error.message.includes('401') || error.message.includes('authentication')) {
      // Clear invalid token
      localStorage.removeItem('access_token');
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleLoginRedirect = () => {
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-bg-primary p-4">
          <div className="max-w-md rounded-lg border border-border-secondary bg-bg-primary p-6 text-center shadow-xs">
            <div className="mx-auto mb-4 size-12 rounded-full bg-red-100 p-2">
              <svg
                className="size-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h2 className="mb-2 text-lg font-semibold text-fg-primary">
              Authentication Error
            </h2>
            
            <p className="mb-4 text-fg-secondary">
              {this.state.error?.message || 'An authentication error occurred. Please try logging in again.'}
            </p>

            <div className="flex gap-3">
              <Button onClick={this.handleLoginRedirect} className="flex-1" variant="contained">
                Go to Login
              </Button>
              
              <Button onClick={this.handleReset} className="flex-1" variant="contained">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useAuthErrorHandler = () => {
  const { logout } = useAuth();

  const handleAuthError = (error: Error) => {
    if (error.message.includes('401') || error.message.includes('authentication')) {
      logout();
      return true;
    }
    return false;
  };

  return { handleAuthError };
};
