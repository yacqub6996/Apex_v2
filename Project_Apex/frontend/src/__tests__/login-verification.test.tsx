import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockLogin, mockResendVerification } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockResendVerification: vi.fn(),
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

vi.mock('@/services/email-verification-service', () => ({
  EmailVerificationService: {
    requestVerification: vi.fn(),
    resendVerification: mockResendVerification,
    verifyEmail: vi.fn(),
  },
}));

import { AuthLoginError } from '@/providers/auth-provider';
import { LoginSplitCarousel } from '@/components/shared-assets/login/login-split-carousel';

describe('LoginSplitCarousel verification-required state', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockResendVerification.mockReset();
  });

  it('renders the verification-required state when login returns EMAIL_NOT_VERIFIED', async () => {
    mockLogin.mockRejectedValueOnce(
      new AuthLoginError(
        'EMAIL_NOT_VERIFIED',
        'Email not verified. Please check your inbox for the verification link.',
        'jordan@example.com',
      ),
    );

    render(<LoginSplitCarousel />);

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'jordan@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Verify your email')).toBeInTheDocument();
    });
    expect(screen.getByText(/j•••••••••••••••@example\.com|j.*@example\.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend verification' })).toBeInTheDocument();
  });

  it('resends the verification email and shows inline success feedback', async () => {
    mockLogin.mockRejectedValueOnce(
      new AuthLoginError('EMAIL_NOT_VERIFIED', 'Email not verified', 'jordan@example.com'),
    );
    mockResendVerification.mockResolvedValueOnce({
      message: 'If an account with that email exists and is not verified, a verification email has been sent.',
    });

    render(<LoginSplitCarousel />);

    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'jordan@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Resend verification' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Resend verification' }));

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalledWith('jordan@example.com');
      expect(screen.getByText('Verification email sent — check your inbox.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Resend in \d+s/ })).toBeInTheDocument();
  });

  it('keeps invalid credentials in the generic error state without resend UI', async () => {
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
});
