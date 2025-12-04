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
  useMediaQuery,
  useTheme,
} from '@mui/material'
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
}

const steps = ['Enter Amount', 'Deposit Address', 'Confirmation']

export const DepositModal: React.FC<DepositModalProps> = ({ open, onClose }) => {
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

  const [amount, setAmount] = useState<string>('100')
  const [asset, setAsset] = useState<Asset>('USDT')
  const [network, setNetwork] = useState<NetworkKey>('TRON_TRC20')

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
    if (isNaN(usdAmount) || usdAmount < 50) {
      return
    }
    await handleGenerateAddress(asset, network, usdAmount)
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
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ mb: 2 }}>
            Crypto Deposit
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
            />
          )}

          {step === 'address' && depositSession && (
            <DepositAddressStep
              session={depositSession}
              onExpire={handleExpire}
              onConfirm={handleConfirmClick}
              isConfirming={isConfirming}
            />
          )}

          {step === 'pending' && (
            <DepositPendingStep onClose={handleClose} />
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          {step === 'input' && (
            <>
              <Button onClick={handleClose} variant="outlined">
                Cancel
              </Button>
              <Button
                onClick={handleGenerateClick}
                variant="contained"
                disabled={isGenerating || parseFloat(amount) < 50}
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
