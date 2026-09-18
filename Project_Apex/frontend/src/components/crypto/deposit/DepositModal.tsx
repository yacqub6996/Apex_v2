/**
 * DepositModal - Main crypto deposit modal component
 * Handles the complete deposit flow: amount input, network selection, address display, timer, and confirmation
 */

import React, { useState, useEffect } from 'react'
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
  IconButton,
  useMediaQuery,
  useTheme,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { DepositInputStep } from './DepositInputStep'
import { DepositAddressStep } from './DepositAddressStep'
import { DepositPendingStep } from './DepositPendingStep'
import { KycDepositWarningDialog } from './KycDepositWarningDialog'
import { useDepositFlow } from '@/hooks/useDeposit'
import { useAuth } from '@/providers/auth-provider'
import type { Asset, NetworkKey } from '@/types/crypto'

interface DepositModalProps {
  open: boolean
  onClose: () => void
  initialAmount?: number
  lockAmount?: boolean
  title?: string
  subtitle?: string
  metadataPayload?: Record<string, any> | null
  description?: string | null
}

const steps = ['Enter Amount', 'Deposit Address', 'Confirmation']

export const DepositModal: React.FC<DepositModalProps> = ({
  open,
  onClose,
  initialAmount,
  lockAmount = false,
  title = 'Crypto Deposit',
  subtitle,
  metadataPayload,
  description,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { user } = useAuth()
  
  const [showKycWarning, setShowKycWarning] = useState(false)
  const [kycWarningAcknowledged, setKycWarningAcknowledged] = useState(false)
  
  const {
    depositSession,
    step,
    setStep,
    handleGenerateAddress,
    handleConfirmPayment,
    handleReset,
    handleExpire,
    isGenerating,
    isConfirming,
    generateError,
    confirmError,
  } = useDepositFlow({
    onSuccess: () => {
      // Address generated successfully
    },
    onConfirmSuccess: () => {
      // Payment confirmed, show success message
    },
    onError: (error) => {
      console.error('Deposit error:', error)
    },
  })

  const [amount, setAmount] = useState<string>(initialAmount !== undefined ? initialAmount.toFixed(2) : '100')
  const [asset, setAsset] = useState<Asset>('USDT')
  const [network, setNetwork] = useState<NetworkKey>('TRON_TRC20')

  useEffect(() => {
    if (open) {
      if (initialAmount !== undefined) {
        setAmount(initialAmount.toFixed(2))
      } else {
        setAmount('100')
      }
    }
  }, [open, initialAmount])

  const isCommission = Boolean(lockAmount || (metadataPayload && metadataPayload.type === 'COPY_TRADING_COMMISSION'))

  // Show KYC warning when modal opens if user hasn't approved KYC
  useEffect(() => {
    if (open && user && user.kyc_status !== 'APPROVED' && !kycWarningAcknowledged) {
      setShowKycWarning(true)
    }
  }, [open, user, kycWarningAcknowledged])

  const handleClose = () => {
    if (step !== 'address' || depositSession?.expired) {
      handleReset()
      setKycWarningAcknowledged(false) // Reset for next time
      onClose()
    }
  }

  const handleKycWarningProceed = () => {
    setShowKycWarning(false)
    setKycWarningAcknowledged(true)
  }

  const handleKycWarningCancel = () => {
    setShowKycWarning(false)
    setKycWarningAcknowledged(false)
    onClose()
  }

  const handleGenerateClick = async () => {
    const usdAmount = parseFloat(amount)
    const minAmount = isCommission ? 0.01 : 50
    if (isNaN(usdAmount) || usdAmount < minAmount) {
      return
    }
    await handleGenerateAddress(asset, network, usdAmount, metadataPayload, description)
  }

  const handleConfirmClick = async () => {
    if (!depositSession) return
    await handleConfirmPayment(depositSession.id)
  }

  const handleRegenerateAddress = () => {
    setStep('input')
  }

  const getStepIndex = () => {
    switch (step) {
      case 'input':
        return 0
      case 'address':
        return 1
      case 'pending':
        return 2
      default:
        return 0
    }
  }

  return (
    <>
      {/* KYC Warning Dialog */}
      {user && (
        <KycDepositWarningDialog
          open={showKycWarning}
          kycStatus={user.kyc_status}
          onClose={handleKycWarningCancel}
          onProceed={handleKycWarningProceed}
        />
      )}

      {/* Main Deposit Dialog */}
      <Dialog
        open={open && !showKycWarning}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3,
            minHeight: isMobile ? '100vh' : '600px',
            m: isMobile ? 0 : 2,
            pt: { xs: 'max(8px, env(safe-area-inset-top, 0px))', sm: 0 },
            pb: { xs: 'max(8px, env(safe-area-inset-bottom, 0px))', sm: 0 },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 1.5, sm: 2.5 }, pb: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  lineHeight: 1.25,
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              size="small"
              sx={{
                color: 'text.secondary',
                mt: -0.5,
                mr: -0.5,
                flexShrink: 0,
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Stepper
            activeStep={getStepIndex()}
            alternativeLabel
            sx={{
              mt: { xs: 1.5, sm: 2 },
              '& .MuiStepLabel-label': {
                fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                mt: { xs: 0.5, sm: 1 },
              },
              '& .MuiStepIcon-root': {
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
              },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 3 } }}>
          {/* Error alerts */}
          {generateError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {generateError.message || 'Failed to generate deposit address'}
            </Alert>
          )}
          {confirmError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {confirmError.message || 'Failed to confirm payment'}
            </Alert>
          )}

          {/* Step content */}
          {step === 'input' && (
            <DepositInputStep
              amount={amount}
              asset={asset}
              network={network}
              onAmountChange={setAmount}
              onAssetChange={setAsset}
              onNetworkChange={setNetwork}
              lockAmount={lockAmount}
              isCommission={isCommission}
            />
          )}

          {step === 'address' && depositSession && (
            <DepositAddressStep
              session={depositSession}
              onExpire={handleExpire}
              onConfirm={handleConfirmClick}
              isConfirming={isConfirming}
              isCommission={isCommission}
            />
          )}

          {step === 'pending' && (
            <DepositPendingStep
              onClose={handleClose}
              isCommission={isCommission}
              heldEquity={metadataPayload?.held_released_equity}
              commissionAmount={metadataPayload?.commission_amount || parseFloat(amount) || 0}
              traderName={metadataPayload?.trader_name}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ p: { xs: 1.5, sm: 2 } }}>
          {step === 'input' && (
            <>
              <Button onClick={handleClose} variant="outlined">
                Cancel
              </Button>
              <Button
                onClick={handleGenerateClick}
                variant="contained"
                disabled={isGenerating || parseFloat(amount) < (isCommission ? 0.01 : 50)}
              >
                {isGenerating ? 'Generating...' : 'Generate Address'}
              </Button>
            </>
          )}

          {step === 'address' && depositSession && (
            <>
              {depositSession.expired ? (
                <Button
                  onClick={handleRegenerateAddress}
                  variant="contained"
                  color="primary"
                  fullWidth
                >
                  Generate New Address
                </Button>
              ) : (
                <Button onClick={handleClose} variant="outlined" fullWidth>
                  Close
                </Button>
              )}
            </>
          )}

          {step === 'pending' && (
            <Button onClick={handleClose} variant="contained" fullWidth>
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}
