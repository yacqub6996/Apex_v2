import { createFileRoute } from '@tanstack/react-router'
import { Login } from '@/pages/login'
import { RouteGuard } from '@/components/auth/route-guard'

export const Route = createFileRoute('/login')({
  component: () => (
    <RouteGuard requireAuth={false} redirectTo="/dashboard">
      <Login />
    </RouteGuard>
  ),
})
