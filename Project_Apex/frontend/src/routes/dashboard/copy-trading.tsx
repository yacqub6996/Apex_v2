import { createFileRoute } from '@tanstack/react-router'
import { CopyTrading } from '@/pages/copy-trading'
import { RouteGuard } from '@/components/auth/route-guard'

export const Route = createFileRoute('/dashboard/copy-trading')({
  component: () => (
    <RouteGuard>
      <CopyTrading />
    </RouteGuard>
  ),
})
