/**
 * DepositAddressStep - Display deposit address with QR code and timer
 */

import React, { useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Alert,
  Chip,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import WarningIcon from '@mui/icons-material/Warning'
import { useDepositTimer, useCopyWithToast } from '@/hooks/useDeposit'
import { QRCode } from '@/components/shared-assets/qr-code'
import type { DepositSession } from '@/types/crypto'
import cryptoTokens from '@/theme/tokens/crypto.json'

interface DepositAddressStepProps {
  session: DepositSession
  onExpire: () => void
  onConfirm: () => void
  isConfirming: boolean
  isCommission?: boolean
  onChangeNetwork?: () => void
}

export const DepositAddressStep: React.FC<DepositAddressStepProps> = ({
  session,
  onExpire,
  onConfirm,
  isConfirming,
  isCommission = false,
  onChangeNetwork,
}) => {
  const { formattedTime, isExpired, isCritical, isWarning } =
    useDepositTimer({
      expiresAt: session.expiresAt,
      onExpire,
    })

  const { copied, copyToClipboard } = useCopyWithToast()
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  const handleCopyAddress = () => {
    copyToClipboard(session.walletAddress)
  }

  const handleCopyMemo = () => {
    if (session.memo) {
      copyToClipboard(session.memo)
    }
  }

  const handleConfirmClick = () => {
    setConfirmDialogOpen(true)
  }

  const handleConfirmPayment = () => {
    setConfirmDialogOpen(false)
    onConfirm()
  }

  const getTimerColor = () => {
    if (isExpired) return cryptoTokens.status.expired.color
    if (isCritical) return cryptoTokens.status.critical.color
    if (isWarning) return cryptoTokens.status.warning.color
    return cryptoTokens.status.pending.color
  }

  const getTimerBgColor = () => {
    if (isExpired) return cryptoTokens.status.expired.background
    if (isCritical) return cryptoTokens.status.critical.background
    if (isWarning) return cryptoTokens.status.warning.background
    return cryptoTokens.status.pending.background
  }

  return (
    <Stack spacing={{ xs: 2, sm: 2.5 }}>
      {/* Timer Display */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.25, sm: 2 },
          textAlign: 'center',
          bgcolor: getTimerBgColor(),
          border: `2px solid ${getTimerColor()}`,
          borderRadius: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.72rem', sm: '0.75rem' } }}>
          {isExpired ? 'Address Expired' : 'Time Remaining'}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            color: getTimerColor(),
            fontWeight: 700,
            fontSize: { xs: '1.75rem', sm: '2.5rem' },
            fontFamily: 'monospace',
            lineHeight: 1.1,
            my: 0.25,
            animation: isCritical ? 'pulse 1s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        >
          {formattedTime}
        </Typography>
        {(isWarning || isCritical) && !isExpired && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
            <WarningIcon fontSize="small" sx={{ mr: 0.5, color: getTimerColor(), fontSize: { xs: 14, sm: 18 } }} />
            <Typography variant="caption" sx={{ color: getTimerColor(), fontWeight: 600, fontSize: { xs: '0.72rem', sm: '0.75rem' } }}>
              {isCritical ? 'Expiring very soon!' : 'Expiring soon'}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Warning/Error Alerts */}
      {isExpired && (
        <Alert severity="error" sx={{ p: { xs: 1, sm: 1.5 } }}>
          This deposit address has expired. Please generate a new address to continue.
        </Alert>
      )}

      {isWarning && !isExpired && (
        <Alert severity="warning" sx={{ p: { xs: 1, sm: 1.5 } }}>
          Your deposit address will expire soon. Please complete your payment promptly.
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }} alignItems="stretch">
        {/* Address Details */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={{ xs: 1.5, sm: 2 }}>
            {/* Deposit Address */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                Deposit Address
              </Typography>
              <TextField
                value={session.walletAddress}
                fullWidth
                size="small"
                InputProps={{
                  readOnly: true,
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: { xs: '0.72rem', sm: '0.85rem' },
                    letterSpacing: { xs: '-0.03em', sm: 'normal' },
                    '& input': {
                      p: { xs: 1, sm: 1.25 },
                      textOverflow: 'ellipsis',
                    },
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={copied ? 'Copied!' : 'Copy address'}>
                        <IconButton
                          onClick={handleCopyAddress}
                          disabled={isExpired}
                          size="small"
                          color={copied ? 'success' : 'default'}
                          sx={{ p: { xs: 0.75, sm: 1 } }}
                        >
                          {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Memo field if required */}
            {session.memo && (
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                  Memo <Chip label="REQUIRED" size="small" color="error" sx={{ ml: 1, height: 20 }} />
                </Typography>
                <TextField
                  value={session.memo}
                  fullWidth
                  size="small"
                  InputProps={{
                    readOnly: true,
                    sx: {
                      fontFamily: 'monospace',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      '& input': { p: { xs: 1, sm: 1.25 } },
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Copy memo">
                          <IconButton onClick={handleCopyMemo} disabled={isExpired} size="small" sx={{ p: { xs: 0.75, sm: 1 } }}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
                <Alert severity="warning" sx={{ mt: 1, p: { xs: 0.75, sm: 1 } }}>
                  <Typography variant="caption">
                    <strong>Important:</strong> You must include this memo when sending your payment, or your funds may be lost.
                  </Typography>
                </Alert>
              </Box>
            )}

            {/* Network and Asset Info */}
            <Stack direction="row" spacing={2} sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1.5, border: 1, borderColor: 'divider', alignItems: 'center' }}>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Network
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {session.network}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Asset
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {session.asset}
                </Typography>
              </Box>
              {!isCommission && onChangeNetwork && !isExpired && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={onChangeNetwork}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25, px: 1 }}
                >
                  Change
                </Button>
              )}
            </Stack>

            {/* Amount Breakdown */}
            <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                Amount Breakdown
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                <Typography variant="caption" color="text.secondary">
                  {isCommission ? 'Trader Performance Commission:' : 'Deposit Amount:'}
                </Typography>
                <Typography variant="caption" fontWeight={600}>${session.amountUsd.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                <Typography variant="caption" color="text.secondary">
                  {isCommission ? 'Blockchain Network Fee:' : 'Network Fee:'}
                </Typography>
                <Typography variant="caption" fontWeight={600}>+${(session.vatFeeUsd || 5).toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" fontWeight={700}>Total Due to Send:</Typography>
                <Typography variant="caption" fontWeight={700} color="primary.main">
                  ${(session.amountUsd + (session.vatFeeUsd || 5)).toFixed(2)} ({session.cryptoAmount} {session.asset})
                </Typography>
              </Box>
            </Box>

            {/* Instructions */}
            <Alert severity="info" sx={{ p: { xs: 1, sm: 1.25 } }}>
              <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.4 }}>
                Send <strong>exactly {session.cryptoAmount} {session.asset}</strong> to the address within {formattedTime}.
                {isCommission
                  ? ' Once sent, tap "I Have Made Payment" below to submit your commission for admin verification.'
                  : ' Once sent, tap "I Have Made Payment" below to submit for admin verification.'}
              </Typography>
            </Alert>
          </Stack>
        </Grid>

        {/* QR Code */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            variant="outlined"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: { xs: 180, md: 220 },
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              bgcolor: 'background.default',
            }}
          >
            <QRCode value={session.walletAddress} size="lg" />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center', fontSize: '0.72rem' }}>
              Scan with your wallet app to copy address
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Primary Confirmation Action (always positioned after QR and address info) */}
      {!isExpired && (
        <Box sx={{ pt: { xs: 0.5, sm: 1 } }}>
          <Button
            variant="contained"
            onClick={handleConfirmClick}
            disabled={isConfirming}
            fullWidth
            size="large"
            sx={{ py: { xs: 1.25, sm: 1.5 }, fontWeight: 700 }}
          >
            {isConfirming ? 'Confirming...' : 'I Have Made Payment'}
          </Button>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{isCommission ? 'Confirm Commission Payment Sent?' : 'Confirm Payment Sent?'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Please confirm that you have sent <strong>{session.cryptoAmount} {session.asset}</strong> (${(session.amountUsd + (session.vatFeeUsd || 5)).toFixed(2)} total) to the deposit address.
          </Typography>
          {isCommission ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Once confirmed, our admin team will verify your payment and release your held copy trading equity to your Copy Trading Wallet.
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Once confirmed, our admin team will verify the payment and credit your account balance.
            </Typography>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="caption">
              Only click confirm if you've actually sent the payment. Our admin team will verify the transaction before crediting.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmPayment} variant="contained" autoFocus>
            Yes, I've Sent Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
