import { createFileRoute } from '@tanstack/react-router';
import { PasswordReset } from '@/pages/auth/password-reset';
import { RouteGuard } from '@/components/auth/route-guard';

export const Route = createFileRoute('/reset-password')({
  component: () => (
    <RouteGuard requireAuth={false} redirectTo="/dashboard">
      <PasswordReset />
    </RouteGuard>
  ),
});

