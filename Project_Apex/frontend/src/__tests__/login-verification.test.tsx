import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockLogin } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
}));

vi.mock('@/providers/auth-provider', () => ({
  AuthLoginError: class AuthLoginError extends Error {
    code: string;
    email?: string;
    constructor(code: string, message: string, email?: string) {
      super(message);
      this.name = 'AuthLoginError';
      this.code = code;
      this.email = email;
    }
  },
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isAdmin: false,
    login: mockLogin,
    loginWithGoogle: vi.fn(),
    exchangeVerificationHandoff: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  }),
}));

import { AuthLoginError } from '@/providers/auth-provider';
import { LoginSplitCarousel } from '@/components/shared-assets/login/login-split-carousel';

describe('LoginSplitCarousel error states', () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it('shows the generic credentials error when login returns INVALID_CREDENTIALS', async () => {
    mockLogin.mockRejectedValueOnce(
      new AuthLoginError('INVALID_CREDENTIALS', 'Incorrect email or password', 'jordan@example.com'),
    );

    render(<LoginSplitCarousel />);

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'jordan@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Incorrect email or password')).toBeInTheDocument();
    });
    expect(screen.queryByText('Verify your email')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend verification' })).not.toBeInTheDocument();
  });

  it('shows the inactive-account error when login returns INACTIVE_ACCOUNT', async () => {
    mockLogin.mockRejectedValueOnce(
      new AuthLoginError('INACTIVE_ACCOUNT', 'Inactive user', 'jordan@example.com'),
    );

    render(<LoginSplitCarousel />);

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'jordan@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Inactive user')).toBeInTheDocument();
    });
    expect(screen.getByText(/Contact support/i)).toBeInTheDocument();
  });

  it('renders a legacy EMAIL_NOT_VERIFIED detail as a plain error without a verification state', async () => {
    mockLogin.mockRejectedValueOnce(
      new AuthLoginError('EMAIL_NOT_VERIFIED', 'Email not verified', 'jordan@example.com'),
    );

    render(<LoginSplitCarousel />);

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'jordan@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Email not verified')).toBeInTheDocument();
    });
    expect(screen.queryByText('Verify your email')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend verification' })).not.toBeInTheDocument();
  });
});
