import { createFileRoute } from '@tanstack/react-router'
import { RouteGuard } from '@/components/auth/route-guard'
import { AdminCryptoWallets } from '@/pages/admin/crypto-wallets'

export const Route = createFileRoute('/admin/crypto-wallets')({
  component: () => (
    <RouteGuard requireAuth={true} allowedRoles={['admin']}>
      <AdminCryptoWallets />
    </RouteGuard>
  ),
})
