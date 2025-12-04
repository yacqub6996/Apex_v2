import { createFileRoute } from '@tanstack/react-router';
import { KycReview } from '@/pages/admin/kyc-review';
import { RouteGuard } from '@/components/auth/route-guard';

export const Route = createFileRoute('/admin/kyc-review')({
  component: () => (
    <RouteGuard allowedRoles={['admin']} redirectTo="/dashboard">
      <KycReview />
    </RouteGuard>
  ),
});