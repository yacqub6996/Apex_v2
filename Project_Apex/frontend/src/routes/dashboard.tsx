import { createFileRoute, Outlet } from '@tanstack/react-router'
import { UserDashboard } from '@/pages/user-dashboard'
import { RouteGuard } from '@/components/auth/route-guard'

export const Route = createFileRoute('/dashboard')({
  component: () => (
    <RouteGuard>
      <UserDashboard>
        <Outlet />
      </UserDashboard>
    </RouteGuard>
  ),
})
