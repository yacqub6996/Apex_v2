import { createFileRoute } from '@tanstack/react-router'
import { PlanManagerPage } from '@/pages/admin/plan-manager'
import { RouteGuard } from '@/components/auth/route-guard'

export const Route = createFileRoute('/admin/plan-manager')({
  component: () => (
    <RouteGuard allowedRoles={['admin']} redirectTo="/dashboard">
      <PlanManagerPage />
    </RouteGuard>
  ),
})

