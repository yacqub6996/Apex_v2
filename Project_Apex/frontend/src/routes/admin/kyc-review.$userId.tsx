import { createFileRoute } from '@tanstack/react-router'
import { RouteGuard } from '@/components/auth/route-guard'
import { KycReviewDetail } from '@/pages/admin/kyc-review-detail'

export const Route = createFileRoute('/admin/kyc-review/$userId')({
  component: () => (
    <RouteGuard allowedRoles={['admin']} redirectTo="/dashboard">
      <KycReviewDetail />
    </RouteGuard>
  ),
})

