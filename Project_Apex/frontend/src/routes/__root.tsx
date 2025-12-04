import { createRootRoute, Outlet } from '@tanstack/react-router'
import { RouteProvider } from '@/providers/router-provider'

export const Route = createRootRoute({
  component: () => (
    <RouteProvider>
      <Outlet />
    </RouteProvider>
  ),
})
