import { createFileRoute } from '@tanstack/react-router'
import { Dashboard as AdminDashboard } from '@/pages/admin-dashboard'
import { RouteGuard } from '@/components/auth/route-guard'

export const Route = createFileRoute('/admin/dashboard')({
  component: () => (
    <RouteGuard allowedRoles={['admin']} redirectTo="/dashboard">
      <AdminDashboard />
    </RouteGuard>
  ),
})
