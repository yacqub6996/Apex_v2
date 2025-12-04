import { createFileRoute } from '@tanstack/react-router'
import { RouteGuard } from '@/components/auth/route-guard'
import { DashboardSettings } from '@/pages/dashboard/settings'

export const Route = createFileRoute('/dashboard/settings')({
  component: () => (
    <RouteGuard>
      <DashboardSettings />
    </RouteGuard>
  ),
})
