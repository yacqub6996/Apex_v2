/**
 * DepositPendingStep - Show pending deposits awaiting verification
 */

import React from 'react'
import {
  Box,
  Stack,
  Typography,
  Alert,
  Paper,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingIcon from '@mui/icons-material/Pending'
import { usePendingDeposits } from '@/services/crypto'
import { formatUsdAmount } from '@/services/crypto'

interface DepositPendingStepProps {
  onClose: () => void
}

export const DepositPendingStep: React.FC<DepositPendingStepProps> = () => {
  const { data: pendingDeposits, isLoading } = usePendingDeposits()

  return (
    <Stack spacing={3}>
      {/* Success Message */}
      <Alert severity="success" icon={<CheckCircleIcon />}>
        <Typography variant="body2" fontWeight={500}>
          Payment Confirmation Received
        </Typography>
        <Typography variant="caption">
          Your payment confirmation has been submitted. Our team will verify your deposit on the blockchain and credit your account within 5-30 minutes.
        </Typography>
      </Alert>

      {/* Pending Deposits List */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Pending Deposits
        </Typography>
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {!isLoading && pendingDeposits && pendingDeposits.length === 0 && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No pending deposits
            </Typography>
          </Paper>
        )}

        {!isLoading && pendingDeposits && pendingDeposits.length > 0 && (
          <Stack spacing={2}>
            {pendingDeposits.slice(0, 5).map((deposit) => (
              <Paper key={deposit.id} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={500}>
                      {formatUsdAmount(deposit.amount || 0)}
                    </Typography>
                    <Chip
                      icon={<PendingIcon />}
                      label={(deposit as any).payment_confirmed_by_user ? 'Awaiting Verification' : 'Awaiting Payment'}
                      size="small"
                      color={(deposit as any).payment_confirmed_by_user ? 'warning' : 'info'}
                    />
                  </Box>
                  
                  <Divider />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Asset
                    </Typography>
                    <Typography variant="caption">
                      {(deposit as any).crypto_coin || 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Network
                    </Typography>
                    <Typography variant="caption">
                      {(deposit as any).crypto_network || 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="caption">
                      {(deposit as any).created_at 
                        ? new Date((deposit as any).created_at).toLocaleString()
                        : 'N/A'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* Info Alert */}
      <Alert severity="info">
        <Typography variant="caption">
          You can close this dialog and continue using the platform. We'll notify you once your deposit is verified and credited to your account.
        </Typography>
      </Alert>
    </Stack>
  )
}
