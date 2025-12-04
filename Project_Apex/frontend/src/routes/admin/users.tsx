import { createFileRoute } from '@tanstack/react-router'
import { UsersDirectory } from '@/pages/admin/users-directory'
import { RouteGuard } from '@/components/auth/route-guard'

export const Route = createFileRoute('/admin/users')({
  component: () => (
    <RouteGuard allowedRoles={['admin']} redirectTo="/dashboard">
      <UsersDirectory />
    </RouteGuard>
  ),
})
