import { LoginService } from '@/api/services/LoginService';
import type { Message, VerifyEmailResponse } from '@/api';

export const EmailVerificationService = {
  // Kept for backward compatibility with the legacy onboarding page, which
  // still calls the authenticated resend endpoint.
  requestVerification(): Promise<Message> {
    return LoginService.loginRequestEmailVerification();
  },
  resendVerification(email: string): Promise<Message> {
    return LoginService.loginResendEmailVerification({ email });
  },
  verifyEmail(token: string): Promise<VerifyEmailResponse> {
    return LoginService.loginVerifyEmail({ token });
  },
};
