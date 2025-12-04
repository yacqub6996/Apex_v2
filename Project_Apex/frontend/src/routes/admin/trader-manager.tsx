import { createFileRoute } from '@tanstack/react-router'
import { TraderManager } from '@/pages/admin/trader-manager'
import { RouteGuard } from '@/components/auth/route-guard'

export const Route = createFileRoute('/admin/trader-manager')({
  component: () => (
    <RouteGuard allowedRoles={['admin']} redirectTo="/dashboard">
      <TraderManager />
    </RouteGuard>
  ),
})
