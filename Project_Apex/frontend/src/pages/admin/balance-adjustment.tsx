import { AdminBalanceAdjustment } from '@/components/admin/admin-balance-adjustment'
import { AdminBalanceOverride } from '@/components/admin/admin-balance-override'
import { Box, Stack, Typography, Divider } from '@mui/material'
import { AdminDashboardLayout } from '@/components/admin/admin-dashboard-layout'

export const BalanceAdjustment = () => {
  return (
    <AdminDashboardLayout
      title="Balance Adjustment"
      subtitle="Admin balance adjustments with full audit trail"
    >
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Stack spacing={4}>
          {/* Superuser Balance Override */}
          <Box>
            <AdminBalanceOverride />
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Standard Balance Adjustment */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Standard Balance Adjustments
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create balance adjustments with predefined action types and validation
            </Typography>
            <AdminBalanceAdjustment />
          </Box>
        </Stack>
      </Box>
    </AdminDashboardLayout>
  )
}
