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
}

export const DepositAddressStep: React.FC<DepositAddressStepProps> = ({
  session,
  onExpire,
  onConfirm,
  isConfirming,
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
    <Stack spacing={3}>
      {/* Timer Display */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          textAlign: 'center',
          bgcolor: getTimerBgColor(),
          border: `2px solid ${getTimerColor()}`,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {isExpired ? 'Address Expired' : 'Time Remaining'}
        </Typography>
        <Typography
          variant="h3"
          sx={{
            color: getTimerColor(),
            fontWeight: 600,
            fontFamily: 'monospace',
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
            <WarningIcon fontSize="small" sx={{ mr: 0.5, color: getTimerColor() }} />
            <Typography variant="caption" sx={{ color: getTimerColor(), fontWeight: 500 }}>
              {isCritical ? 'Expiring very soon!' : 'Expiring soon'}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Warning/Error Alerts */}
      {isExpired && (
        <Alert severity="error">
          This deposit address has expired. Please generate a new address to continue.
        </Alert>
      )}

      {isWarning && !isExpired && (
        <Alert severity="warning">
          Your deposit address will expire soon. Please complete your payment promptly.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left: Address Details */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            {/* Deposit Address */}
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Deposit Address
              </Typography>
              <TextField
                value={session.walletAddress}
                fullWidth
                size="small"
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={copied ? 'Copied!' : 'Copy address'}>
                        <IconButton
                          onClick={handleCopyAddress}
                          disabled={isExpired}
                          size="small"
                          color={copied ? 'success' : 'default'}
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
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Memo <Chip label="REQUIRED" size="small" color="error" sx={{ ml: 1, height: 20 }} />
                </Typography>
                <TextField
                  value={session.memo}
                  fullWidth
                  size="small"
                  InputProps={{
                    readOnly: true,
                    sx: { fontFamily: 'monospace' },
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Copy memo">
                          <IconButton onClick={handleCopyMemo} disabled={isExpired} size="small">
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    <strong>Important:</strong> You must include this memo when sending your payment, or your funds may be lost.
                  </Typography>
                </Alert>
              </Box>
            )}

            {/* Network and Asset Info */}
            <Stack direction="row" spacing={2}>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Network
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {session.network}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Asset
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {session.asset}
                </Typography>
              </Box>
            </Stack>

            {/* Instructions */}
            <Alert severity="info">
              <Typography variant="body2">
                Send <strong>exactly {session.cryptoAmount} {session.asset}</strong> to the address above within {formattedTime}.
                After sending, click "I Have Made Payment" below.
              </Typography>
            </Alert>

            {/* Confirm Payment Button */}
            {!isExpired && (
              <Button
                variant="contained"
                onClick={handleConfirmClick}
                disabled={isConfirming}
                fullWidth
                size="large"
              >
                {isConfirming ? 'Confirming...' : 'I Have Made Payment'}
              </Button>
            )}
          </Stack>
        </Grid>

        {/* Right: QR Code */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <QRCode value={session.walletAddress} size="lg" />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Scan to copy address
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Payment Sent?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Please confirm that you have sent <strong>{session.cryptoAmount} {session.asset}</strong> to the deposit address.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="caption">
              Only click confirm if you've actually sent the payment. Our team will verify the transaction on the blockchain.
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
