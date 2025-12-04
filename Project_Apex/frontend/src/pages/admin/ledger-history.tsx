import { AdminLedgerHistory } from '@/components/admin/admin-ledger-history'
import { AdminDashboardLayout } from '@/components/admin/admin-dashboard-layout'

export const LedgerHistory = () => {
  return (
    <AdminDashboardLayout
      title="Ledger History"
      subtitle="Complete audit trail of all financial operations"
    >
      <AdminLedgerHistory />
    </AdminDashboardLayout>
  )
}
