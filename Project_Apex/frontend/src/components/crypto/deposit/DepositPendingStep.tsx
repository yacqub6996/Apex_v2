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

const isDepositCommission = (deposit: any) => {
  return (
    deposit?.metadata_payload?.type === 'COPY_TRADING_COMMISSION' ||
    deposit?.type === 'COPY_TRADING_COMMISSION' ||
    (typeof deposit?.description === 'string' && deposit.description.toLowerCase().includes('commission'))
  )
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
        <Typography variant="body2" fontWeight={700}>
          {isCommission ? 'Commission Payment Submitted for Verification' : 'Payment Confirmation Received'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}>
          {isCommission
            ? `Your commission payment${commissionAmount ? ` of ${formatUsdAmount(commissionAmount)}` : ''} has been submitted for blockchain verification${traderName ? ` (${traderName})` : ''}. Our admin team will verify the transaction on the blockchain (typically within 5-30 minutes).`
            : 'Your payment confirmation has been submitted. Our team will verify your deposit on the blockchain and credit your account within 5-30 minutes.'}
        </Typography>
      </Alert>

      {/* Commission Settlement Notice */}
      {isCommission && (
        <Alert
          severity="info"
          sx={{
            p: { xs: 1.25, sm: 1.5 },
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.06)',
            border: 1,
            borderColor: 'primary.light',
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'primary.main', fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>
            Equity Held Pending Commission Settlement
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', lineHeight: 1.5 }}>
            This payment settles the trader's performance fee and does <strong>not</strong> credit your cash balance. Your liquidated copy equity {heldEquity ? `of ${formatUsdAmount(heldEquity)} ` : ''}remains securely held in escrow and will be <strong>automatically unlocked and credited directly to your Copy Trading Wallet</strong> as soon as this commission transaction is verified by our team.
          </Typography>
        </Alert>
      )}

      {/* Pending Deposits List */}
      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Pending {isCommission ? 'Commission & Deposit' : 'Deposit'} Transactions
        </Typography>
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {!isLoading && pendingDeposits && pendingDeposits.length === 0 && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No pending deposits
            </Typography>
          </Paper>
        )}

        {!isLoading && pendingDeposits && pendingDeposits.length > 0 && (
          <Stack spacing={1.5}>
            {pendingDeposits.slice(0, 5).map((deposit) => {
              const isComm = isDepositCommission(deposit)
              return (
                <Paper key={deposit.id} variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {formatUsdAmount(deposit.amount || 0)}
                        </Typography>
                        {isComm && (
                          <Chip
                            label="Commission Settlement"
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                          />
                        )}
                      </Box>
                      <Chip
                        icon={<PendingIcon sx={{ fontSize: '14px !important' }} />}
                        label={(deposit as any).payment_confirmed_by_user ? 'Awaiting Verification' : 'Awaiting Payment'}
                        size="small"
                        color={(deposit as any).payment_confirmed_by_user ? 'warning' : 'info'}
                        sx={{ height: 24, fontSize: '0.72rem' }}
                      />
                    </Box>
                    
                    <Divider />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Asset
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
                        {(deposit as any).crypto_coin || 'N/A'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Network
                      </Typography>
                      <Typography variant="caption" fontWeight={500}>
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
              )
            })}
          </Stack>
        )}
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ p: { xs: 1, sm: 1.5 } }}>
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.4 }}>
          {isCommission
            ? 'You can safely close this dialog. Your released equity remains secured in escrow and will appear in your Copy Trading Wallet once confirmed.'
            : "You can close this dialog and continue using the platform. We'll notify you once your deposit is verified and credited to your account."}
        </Typography>
      </Alert>
    </Stack>
  )
}
