import { createFileRoute } from '@tanstack/react-router'
import { LongTermManager } from '@/pages/admin/long-term-manager'
import { RouteGuard } from '@/components/auth/route-guard'

export const Route = createFileRoute('/admin/long-term')({
  component: () => (
    <RouteGuard allowedRoles={['admin']} redirectTo="/dashboard">
      <LongTermManager />
    </RouteGuard>
  ),
})

