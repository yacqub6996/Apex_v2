import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockUseAuth, mockResendVerification } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockResendVerification: vi.fn(),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@/services/email-verification-service', () => ({
  EmailVerificationService: {
    requestVerification: vi.fn(),
    resendVerification: mockResendVerification,
    verifyEmail: vi.fn(),
  },
}));

import { EmailVerificationBanner } from '@/components/dashboard/email-verification-banner';

describe('EmailVerificationBanner', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockResendVerification.mockReset();
    try {
      window.sessionStorage.clear();
    } catch {
      // jsdom sessionStorage unavailable in some configurations
    }
  });

  it('does not render for verified users', () => {
    mockUseAuth.mockReturnValue({ user: { email: 'jordan@example.com', email_verified: true } });
    render(<EmailVerificationBanner />);
    expect(screen.queryByText('Verify your email')).not.toBeInTheDocument();
  });

  it('renders for unverified users with masked email and resend action', () => {
    mockUseAuth.mockReturnValue({ user: { email: 'jordan@example.com', email_verified: false } });
    render(<EmailVerificationBanner />);
    expect(screen.getByText('Verify your email')).toBeInTheDocument();
    expect(screen.getByText(/j.•+@example\.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend verification' })).toBeInTheDocument();
  });

  it('resends the verification email and shows inline success feedback with cooldown', async () => {
    mockUseAuth.mockReturnValue({ user: { email: 'jordan@example.com', email_verified: false } });
    mockResendVerification.mockResolvedValueOnce({
      message: 'If an account with that email exists and is not verified, a verification email has been sent.',
    });

    render(<EmailVerificationBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification' }));

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalledWith('jordan@example.com');
      expect(screen.getByText('Verification email sent — check your inbox.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Resend in \d+s/ })).toBeInTheDocument();
  });

  it('can be dismissed for the session', () => {
    mockUseAuth.mockReturnValue({ user: { email: 'jordan@example.com', email_verified: false } });
    render(<EmailVerificationBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss verification reminder' }));
    expect(screen.queryByText('Verify your email')).not.toBeInTheDocument();
  });
});
