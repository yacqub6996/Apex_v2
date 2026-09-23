import { createFileRoute } from '@tanstack/react-router'
import { RouteGuard } from '@/components/auth/route-guard'
import { DashboardSettings } from '@/pages/dashboard/settings'

export const Route = createFileRoute('/dashboard/settings')({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    return {
      tab: typeof search.tab === 'string' ? search.tab : undefined,
    }
  },
  component: () => (
    <RouteGuard>
      <DashboardSettings />
    </RouteGuard>
  ),
})
