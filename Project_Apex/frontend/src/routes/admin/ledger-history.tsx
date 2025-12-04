import { createFileRoute } from '@tanstack/react-router'
import { RouteGuard } from '@/components/auth/route-guard'
import { LedgerHistory } from '@/pages/admin/ledger-history'

export const Route = createFileRoute('/admin/ledger-history')({
  component: () => (
    <RouteGuard requireAuth={true} allowedRoles={['admin']}>
      <LedgerHistory />
    </RouteGuard>
  ),
})
