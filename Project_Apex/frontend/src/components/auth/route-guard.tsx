import { ReactNode, useEffect } from 'react';
import { useAuth, UserRole } from '@/providers/auth-provider';
import { useRouter } from '@tanstack/react-router';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: UserRole[];
}

export const RouteGuard = ({
  children,
  requireAuth = true,
  redirectTo = '/login',
  allowedRoles,
}: RouteGuardProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  console.log('RouteGuard state:', {
    requireAuth,
    isAuthenticated,
    isLoading,
    user: user?.email,
    allowedRoles,
    redirectTo
  });

  useEffect(() => {
    if (isLoading) {
      console.log('RouteGuard: Still loading, waiting...');
      return;
    }

    console.log('RouteGuard: Checking access rules...');

    if (requireAuth && !isAuthenticated) {
      console.log('RouteGuard: Authentication required but not authenticated, redirecting to', redirectTo);
      router.navigate({ to: redirectTo });
      return;
    }

    if (allowedRoles && isAuthenticated && user && !allowedRoles.includes(user.role)) {
      console.log('RouteGuard: User role not allowed, redirecting to', redirectTo);
      router.navigate({ to: redirectTo });
      return;
    }

    if (!requireAuth && isAuthenticated) {
      console.log('RouteGuard: Already authenticated but route requires no auth, redirecting to', redirectTo);
      router.navigate({ to: redirectTo });
      return;
    }

    console.log('RouteGuard: Access granted');
  }, [allowedRoles, isAuthenticated, isLoading, redirectTo, requireAuth, router, user]);

  if (isLoading) {
    console.log('RouteGuard: Rendering loading state');
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingIndicator size="xl" />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    console.log('RouteGuard: Not authenticated for protected route');
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    console.log('RouteGuard: User role not allowed');
    return null;
  }

  if (!requireAuth && isAuthenticated) {
    console.log('RouteGuard: Already authenticated for public route');
    return null;
  }

  console.log('RouteGuard: Rendering children');
  return <>{children}</>;
};

