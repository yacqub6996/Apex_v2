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
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { WithdrawalInputStep } from './WithdrawalInputStep'
import { WithdrawalReviewStep } from './WithdrawalReviewStep'
import { WithdrawalPendingStep } from './WithdrawalPendingStep'
import { useWithdrawalFlow } from '@/hooks/useWithdrawal'
import { useAuth } from '@/providers/auth-provider'

export type WalletType = 'main' | 'copy' | 'long-term'

interface WithdrawalModalProps {
  open: boolean
  onClose: () => void
  walletType?: WalletType
}

const steps = ['Enter Details', 'Review', 'Confirmation']

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ 
  open, 
  onClose, 
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
      // Withdrawal submitted successfully
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
          minHeight: isMobile ? '100vh' : '600px',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ mb: 2 }}>
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
        </Box>
        <Stepper activeStep={getStepIndex()} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
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

      <DialogActions sx={{ p: 2 }}>
        {step === 'input' && (
          <Button onClick={handleClose} variant="outlined" fullWidth>
            Cancel
          </Button>
        )}

        {step === 'pending' && (
          <Button onClick={handleClose} variant="contained" fullWidth>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
