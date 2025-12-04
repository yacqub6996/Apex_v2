import { createFileRoute } from '@tanstack/react-router';
import { KycPage } from '@/pages/kyc';
import { RouteGuard } from '@/components/auth/route-guard';

export const Route = createFileRoute('/kyc')({
  component: () => (
    <RouteGuard>
      <KycPage />
    </RouteGuard>
  ),
});