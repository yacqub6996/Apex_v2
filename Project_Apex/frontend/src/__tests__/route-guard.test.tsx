import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: useAuthMock,
}));

import { RouteGuard } from '@/components/auth/route-guard';

describe('RouteGuard hydration semantics', () => {
  it('renders children while auth mutations are pending (isLoading) as long as hydration finished', () => {
    // Regression: isLoading includes login mutation pending state. The login
    // route must keep its children mounted during a login attempt so
    // EMAIL_NOT_VERIFIED state is not lost by a remount.
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: true,
      isHydrating: false,
      isAuthenticated: false,
    });

    render(
      <RouteGuard requireAuth={false} redirectTo="/dashboard">
        <div>login-page-content</div>
      </RouteGuard>,
    );

    expect(screen.getByText('login-page-content')).toBeInTheDocument();
  });

  it('shows the loading state while the session is hydrating', () => {
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: true,
      isHydrating: true,
      isAuthenticated: false,
    });

    render(
      <RouteGuard requireAuth={false} redirectTo="/dashboard">
        <div>login-page-content</div>
      </RouteGuard>,
    );

    expect(screen.queryByText('login-page-content')).not.toBeInTheDocument();
  });
});
