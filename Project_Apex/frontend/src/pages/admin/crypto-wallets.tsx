import { AdminCryptoWalletsManager } from '@/components/admin/admin-crypto-wallets'
import { Box } from '@mui/material'
import { AdminDashboardLayout } from '@/components/admin/admin-dashboard-layout'

export const AdminCryptoWallets = () => {
  return (
    <AdminDashboardLayout
      title="Deposit Wallets"
      subtitle="Manage platform cryptocurrency receiving addresses with live QR previews and format validation"
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <AdminCryptoWalletsManager />
      </Box>
    </AdminDashboardLayout>
  )
}
