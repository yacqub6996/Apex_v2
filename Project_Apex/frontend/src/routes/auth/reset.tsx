import { createFileRoute } from '@tanstack/react-router'
import { PasswordResetRequest } from '@/pages/auth/password-reset-request'
import { RouteGuard } from '@/components/auth/route-guard'

export const Route = createFileRoute('/auth/reset')({
  component: () => (
    <RouteGuard requireAuth={false} redirectTo="/dashboard">
      <PasswordResetRequest />
    </RouteGuard>
  ),
})
