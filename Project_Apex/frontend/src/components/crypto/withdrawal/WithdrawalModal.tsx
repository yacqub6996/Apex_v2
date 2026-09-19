/**
 * WithdrawalModal - Main crypto withdrawal modal component
 * Handles the complete withdrawal flow: asset/network selection, address input, review, and submission
 */

import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Box,
  Chip,
  Typography,
  IconButton,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { WithdrawalInputStep } from './WithdrawalInputStep'
import { WithdrawalReviewStep } from './WithdrawalReviewStep'
import { WithdrawalPendingStep } from './WithdrawalPendingStep'
import { useWithdrawalFlow } from '@/hooks/useWithdrawal'
import { useAuth } from '@/providers/auth-provider'

export type WalletType = 'main' | 'copy' | 'long-term'

interface WithdrawalModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  walletType?: WalletType
}

const steps = ['Enter Details', 'Review', 'Confirmation']

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ 
  open, 
  onClose, 
  onSuccess,
  walletType = 'main' 
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { user } = useAuth()

  const {
    step,
    formData,
    addressError,
    handleSubmitForm,
    handleConfirmWithdrawal,
    handleBack,
    handleReset,
    isSubmitting,
    submitError,
  } = useWithdrawalFlow({
    walletType,
    onSuccess: () => {
      onSuccess?.()
    },
    onError: (error) => {
      console.error('Withdrawal error:', error)
    },
  })

  const handleClose = () => {
    if (step !== 'pending') {
      handleReset()
    }
    onClose()
  }

  const getStepIndex = () => {
    switch (step) {
      case 'input':
        return 0
      case 'review':
        return 1
      case 'pending':
        return 2
      default:
        return 0
    }
  }

  // Check KYC status
  const kycApproved = user?.kyc_status === 'APPROVED'

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          height: isMobile ? '100dvh' : 'auto',
          minHeight: isMobile ? '100dvh' : '600px',
          maxHeight: isMobile ? '100dvh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          m: isMobile ? 0 : 2,
        },
      }}
    >
      <DialogTitle sx={{ flexShrink: 0, p: { xs: 2, sm: 3 }, pb: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Crypto Withdrawal</Typography>
            {walletType !== 'main' && (
              <Chip 
                label={walletType === 'copy' ? 'Copy Trading Wallet' : 'Long-Term Wallet'} 
                size="small" 
                color="primary"
                sx={{ borderRadius: 1.5 }}
              />
            )}
          </Box>
          <IconButton
            edge="end"
            onClick={handleClose}
            aria-label="close"
            size="small"
            disabled={isSubmitting}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <Stepper activeStep={getStepIndex()} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: { xs: 2, sm: 3 },
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {/* KYC Warning */}
        {!kycApproved && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Withdrawals require KYC approval. Please complete KYC verification to proceed.
          </Alert>
        )}

        {/* Error alerts */}
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError.message || 'Failed to submit withdrawal request'}
          </Alert>
        )}

        {/* Step content */}
        {step === 'input' && (
          <WithdrawalInputStep
            onSubmit={handleSubmitForm}
            addressError={addressError}
            disabled={!kycApproved}
            walletType={walletType}
            availableBalance={
              walletType === 'copy' 
                ? user?.copy_trading_wallet_balance ?? 0
                : walletType === 'long-term'
                ? user?.long_term_wallet_balance ?? 0
                : user?.balance ?? 0
            }
          />
        )}

        {step === 'review' && formData && (
          <WithdrawalReviewStep
            formData={formData}
            onConfirm={handleConfirmWithdrawal}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        )}

        {step === 'pending' && (
          <WithdrawalPendingStep onClose={handleClose} />
        )}
      </DialogContent>

      {step !== 'review' && (
        <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, flexShrink: 0, borderTop: 1, borderColor: 'divider' }}>
          {step === 'input' && (
            <Stack
              direction={{ xs: 'column-reverse', sm: 'row' }}
              spacing={1.5}
              sx={{ width: '100%', justifyContent: 'flex-end' }}
            >
              <Button
                onClick={handleClose}
                variant="outlined"
                color="inherit"
                fullWidth={isMobile}
                sx={{ minHeight: 44 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="withdrawal-form"
                variant="contained"
                fullWidth={isMobile}
                sx={{ minHeight: 44 }}
              >
                Review Withdrawal
              </Button>
            </Stack>
          )}

          {step === 'pending' && (
            <Button onClick={handleClose} variant="contained" fullWidth sx={{ minHeight: 44 }}>
              Done
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  )
}
