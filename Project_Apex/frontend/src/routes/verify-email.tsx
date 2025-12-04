import { createFileRoute } from '@tanstack/react-router';
import { VerifyEmailPage } from '@/pages/verify-email';

export const Route = createFileRoute('/verify-email/' as any)({
  component: VerifyEmailPage,
});

