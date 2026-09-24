import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockVerifyEmail, mockExchangeHandoff, mockNavigate } = vi.hoisted(() => ({
  mockVerifyEmail: vi.fn(),
  mockExchangeHandoff: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: mockNavigate }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    exchangeVerificationHandoff: mockExchangeHandoff,
  }),
}));

vi.mock('@/services/email-verification-service', () => ({
  EmailVerificationService: {
    verifyEmail: mockVerifyEmail,
  },
}));

import { VerifyEmailPage } from '@/pages/verify-email';

const renderPage = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <VerifyEmailPage />
    </QueryClientProvider>,
  );
};

describe('VerifyEmailPage verification flow', () => {
  beforeEach(() => {
    mockVerifyEmail.mockReset();
    mockExchangeHandoff.mockReset();
    mockNavigate.mockReset();
  });

  it('verifies the email, exchanges the handoff, and redirects to the dashboard', async () => {
    window.history.replaceState({}, '', '/verify-email?token=verification-token-123');
    mockVerifyEmail.mockResolvedValue({
      message: 'Email verified successfully',
      handoff_token: 'handoff-123',
      handoff_expires_in: 300,
    });
    mockExchangeHandoff.mockResolvedValue('user');

    renderPage();

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith('verification-token-123');
    });
    await waitFor(() => {
      expect(mockExchangeHandoff).toHaveBeenCalledWith('handoff-123');
    });
    await waitFor(() => {
      expect(screen.getByText('Email verified!')).toBeInTheDocument();
    });
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
      },
      { timeout: 2000 },
    );
  });

  it('shows an explanatory error and return-to-login when the handoff exchange fails', async () => {
    window.history.replaceState({}, '', '/verify-email?token=verification-token-123');
    mockVerifyEmail.mockResolvedValue({
      message: 'Email verified successfully',
      handoff_token: 'handoff-123',
      handoff_expires_in: 300,
    });
    mockExchangeHandoff.mockRejectedValue(new Error('expired handoff'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Verification failed')).toBeInTheDocument();
    });
    expect(screen.getByText(/sign-in could not be completed/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith({ to: '/dashboard' });
    expect(screen.getByRole('button', { name: 'Return to sign in' })).toBeInTheDocument();
  });

  it('shows only the return-to-login action when navigating directly without a token', async () => {
    window.history.replaceState({}, '', '/verify-email');

    renderPage();

    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
    expect(mockVerifyEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Return to sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to dashboard' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Return to sign in' }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
  });
});
