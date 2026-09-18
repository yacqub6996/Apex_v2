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
  isCommission?: boolean
  heldEquity?: number
  commissionAmount?: number
  traderName?: string
}

export const DepositPendingStep: React.FC<DepositPendingStepProps> = ({
  isCommission = false,
  heldEquity,
  commissionAmount,
  traderName,
}) => {
  const { data: pendingDeposits, isLoading } = usePendingDeposits()

  return (
    <Stack spacing={{ xs: 2, sm: 2.5 }}>
      {/* Success Message */}
      <Alert severity="success" icon={<CheckCircleIcon />}>
        <Typography variant="body2" fontWeight={600}>
          {isCommission ? 'Commission Payment Submitted for Verification' : 'Payment Confirmation Received'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          {isCommission
            ? `Your commission payment${commissionAmount ? ` of ${formatUsdAmount(commissionAmount)}` : ''} has been submitted for blockchain verification${traderName ? ` for trader ${traderName}` : ''}. Once confirmed by our team (typically within 5-30 minutes), your released copy equity ${
                heldEquity ? `(${formatUsdAmount(heldEquity)}) ` : ''
              }will be unlocked and credited directly to your Copy Trading Wallet.`
            : 'Your payment confirmation has been submitted. Our team will verify your deposit on the blockchain and credit your account within 5-30 minutes.'}
        </Typography>
      </Alert>

      {/* Commission Settlement Notice */}
      {isCommission && (
        <Alert severity="warning" sx={{ p: { xs: 1.25, sm: 1.5 } }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
            Equity Held Pending Commission Settlement
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
            This payment is for trader commission{traderName ? ` (${traderName})` : ''} and does <strong>not</strong> credit your cash balance. Your liquidated equity {heldEquity ? `of ${formatUsdAmount(heldEquity)} ` : ''}remains securely held in escrow and will be credited to your Copy Trading Wallet as soon as this commission is approved.
          </Typography>
        </Alert>
      )}

      {/* Pending Deposits List */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Pending {isCommission ? 'Commission & Deposit' : 'Deposit'} Transactions
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
      <Alert severity="info" sx={{ p: { xs: 1, sm: 1.5 } }}>
        <Typography variant="caption">
          {isCommission
            ? 'You can close this dialog. Released equity remains held pending commission verification and will appear in your Copy Trading Wallet once confirmed.'
            : "You can close this dialog and continue using the platform. We'll notify you once your deposit is verified and credited to your account."}
        </Typography>
      </Alert>
    </Stack>
  )
}
