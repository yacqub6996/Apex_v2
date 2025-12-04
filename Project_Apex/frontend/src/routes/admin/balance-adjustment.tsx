import { createFileRoute } from '@tanstack/react-router'
import { RouteGuard } from '@/components/auth/route-guard'
import { BalanceAdjustment } from '@/pages/admin/balance-adjustment'

export const Route = createFileRoute('/admin/balance-adjustment')({
  component: () => (
    <RouteGuard requireAuth={true} allowedRoles={['admin']}>
      <BalanceAdjustment />
    </RouteGuard>
  ),
})
