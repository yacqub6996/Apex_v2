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
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { DepositInputStep } from './DepositInputStep'
import { DepositAddressStep } from './DepositAddressStep'
import { DepositPendingStep } from './DepositPendingStep'
import { KycDepositWarningDialog } from './KycDepositWarningDialog'
import { useDepositFlow } from '@/hooks/useDeposit'
import { useAuth } from '@/providers/auth-provider'
import { extractApiErrorMessage } from '@/utils/errors'
import type { Asset, NetworkKey } from '@/types/crypto'
import { ApexBottomSheet } from '@/components/ui/apex-bottom-sheet'
import { useModalSuppression } from '@/stores/support-widget-store'

interface DepositModalProps {
  open: boolean
  onClose: () => void
  initialAmount?: number
  lockAmount?: boolean
  title?: string
  subtitle?: string
  metadataPayload?: Record<string, any> | null
  description?: string | null
  onConfirmSuccess?: () => void
}

const ordinarySteps = ['Enter Amount', 'Deposit Address', 'Confirmation']
const commissionSteps = ['Commission Details', 'Payment Address', 'Verification']

export const DepositModal: React.FC<DepositModalProps> = ({
  open,
  onClose,
  initialAmount,
  lockAmount = false,
  title = 'Crypto Deposit',
  subtitle,
  metadataPayload,
  description,
  onConfirmSuccess,
}) => {
  const { user } = useAuth()
  useModalSuppression(open)
  
  const [showKycWarning, setShowKycWarning] = useState(false)
  const [kycWarningAcknowledged, setKycWarningAcknowledged] = useState(false)
  
  const [confirmDismissOpen, setConfirmDismissOpen] = useState(false)
  const [confirmChangeNetworkOpen, setConfirmChangeNetworkOpen] = useState(false)

  const {
    depositSession,
    step,
    setStep,
    handleGenerateAddress,
    handleConfirmPayment,
    handleReset,
    handleBackToInput,
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
      onConfirmSuccess?.()
    },
    onError: (error) => {
      console.error('Deposit error:', error)
    },
  })

  const isCommission = Boolean(lockAmount || (metadataPayload && metadataPayload.type === 'COPY_TRADING_COMMISSION'))

  const [amount, setAmount] = useState<string>(initialAmount !== undefined ? initialAmount.toFixed(2) : '100')
  const [asset, setAsset] = useState<Asset>(isCommission ? 'BTC' : 'USDT')
  const [network, setNetwork] = useState<NetworkKey>(isCommission ? 'BITCOIN' : 'TRON_TRC20')

  useEffect(() => {
    if (open) {
      if (initialAmount !== undefined) {
        setAmount(initialAmount.toFixed(2))
      } else {
        setAmount('100')
      }
      if (isCommission) {
        setAsset('BTC')
        setNetwork('BITCOIN')
      }
    }
  }, [open, initialAmount, isCommission])

  // Show KYC warning when modal opens if user hasn't approved KYC
  useEffect(() => {
    if (open && user && user.kyc_status !== 'APPROVED' && !kycWarningAcknowledged) {
      setShowKycWarning(true)
    }
  }, [open, user, kycWarningAcknowledged])

  const handlePerformClose = () => {
    setConfirmDismissOpen(false)
    setConfirmChangeNetworkOpen(false)
    handleReset()
    setKycWarningAcknowledged(false)
    onClose()
  }

  const handleRequestClose = () => {
    if (step === 'address' && depositSession && !depositSession.expired) {
      setConfirmDismissOpen(true)
      return
    }
    handlePerformClose()
  }

  const handleConfirmDismiss = () => {
    handlePerformClose()
  }

  const handleRequestChangeNetwork = () => {
    if (isCommission) return
    if (step === 'address' && depositSession && !depositSession.expired) {
      setConfirmChangeNetworkOpen(true)
      return
    }
    handleBackToInput()
  }

  const handleConfirmChangeNetwork = () => {
    setConfirmChangeNetworkOpen(false)
    handleBackToInput()
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
    const targetAsset: Asset = isCommission ? 'BTC' : asset
    const targetNetwork: NetworkKey = isCommission ? 'BITCOIN' : network
    await handleGenerateAddress(targetAsset, targetNetwork, usdAmount, metadataPayload, description)
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
      <ApexBottomSheet
        open={open && !showKycWarning}
        onClose={handleRequestClose}
        variant="fullscreen"
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            px: { xs: 2, sm: 3 },
            pt: { xs: 'max(10px, env(safe-area-inset-top, 0px))', sm: 2.5 },
            pb: { xs: 1.25, sm: 2 },
            borderBottom: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '1.05rem', sm: '1.25rem' },
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </Typography>
              {subtitle && !isCommission && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {subtitle}
                </Typography>
              )}
              {isCommission && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontWeight: 500 }}>
                  Performance Settlement • Equity Held in Escrow
                </Typography>
              )}
            </Box>
            <IconButton
              aria-label="close"
              onClick={handleRequestClose}
              size="small"
              sx={{
                color: 'text.secondary',
                flexShrink: 0,
                p: { xs: 0.75, sm: 1 },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Stepper
            activeStep={getStepIndex()}
            alternativeLabel
            sx={{
              mt: { xs: 1.25, sm: 2 },
              '& .MuiStepLabel-label': {
                fontSize: { xs: '0.68rem', sm: '0.8125rem' },
                mt: { xs: 0.25, sm: 0.75 },
                fontWeight: 500,
              },
              '& .MuiStepIcon-root': {
                fontSize: { xs: '1.15rem', sm: '1.4rem' },
              },
            }}
          >
            {(isCommission ? commissionSteps : ordinarySteps).map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </DialogTitle>

        <DialogContent
          dividers={false}
          sx={{
            flex: 1,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            p: { xs: 1.75, sm: 3 },
          }}
        >
          {/* Error alerts */}
          {generateError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {extractApiErrorMessage(
                generateError,
                isCommission ? 'Failed to prepare payment address' : 'Failed to generate deposit address',
              )}
            </Alert>
          )}
          {confirmError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {extractApiErrorMessage(confirmError, 'Failed to confirm payment')}
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
              settlementInfo={
                metadataPayload
                  ? {
                      traderName: metadataPayload.trader_name,
                      sessionProfit: metadataPayload.session_profit,
                      feePercentage: metadataPayload.fee_percentage,
                      heldReleasedEquity: metadataPayload.held_released_equity,
                    }
                  : null
              }
            />
          )}

          {step === 'address' && depositSession && (
            <DepositAddressStep
              session={depositSession}
              onExpire={handleExpire}
              onConfirm={handleConfirmClick}
              isConfirming={isConfirming}
              isCommission={isCommission}
              onChangeNetwork={isCommission ? undefined : handleRequestChangeNetwork}
            />
          )}

          {step === 'pending' && (
            <DepositPendingStep
              onClose={handlePerformClose}
              isCommission={isCommission}
              heldEquity={metadataPayload?.held_released_equity}
              commissionAmount={metadataPayload?.commission_amount || parseFloat(amount) || 0}
              traderName={metadataPayload?.trader_name}
            />
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            pb: { xs: 'max(12px, env(safe-area-inset-bottom, 0px))', sm: 2 },
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexShrink: 0,
            gap: 1.5,
          }}
        >
          {step === 'input' && (
            <>
              <Button onClick={handleRequestClose} variant="outlined" sx={{ minWidth: 90 }}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateClick}
                variant="contained"
                disabled={isGenerating || parseFloat(amount) < (isCommission ? 0.01 : 50)}
                sx={{ flex: { xs: 1, sm: 'none' }, minWidth: 160 }}
              >
                {isGenerating
                  ? (isCommission ? 'Preparing Address...' : 'Generating...')
                  : (isCommission ? 'Proceed to Payment' : 'Generate Address')}
              </Button>
            </>
          )}

          {step === 'address' && depositSession && (
            <Box sx={{ display: 'flex', width: '100%', gap: 1.5, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Button
                onClick={handleRequestChangeNetwork}
                variant="outlined"
                color="inherit"
                sx={{ minWidth: { xs: '100%', sm: 160 } }}
              >
                Change Coin / Network
              </Button>
              {depositSession.expired ? (
                <Button
                  onClick={handleRegenerateAddress}
                  variant="contained"
                  color="primary"
                  sx={{ minWidth: { xs: '100%', sm: 160 } }}
                >
                  {isCommission ? 'Renew Address' : 'Generate New Address'}
                </Button>
              ) : (
                <Button onClick={handleRequestClose} variant="outlined" sx={{ minWidth: { xs: '100%', sm: 100 } }}>
                  Close
                </Button>
              )}
            </Box>
          )}

          {step === 'pending' && (
            <Button onClick={handlePerformClose} variant="contained" fullWidth>
              {isCommission ? 'Return to Copy Trading' : 'Done'}
            </Button>
          )}
        </DialogActions>
      </ApexBottomSheet>

      {/* Confirmation Dialog for Dismissing Active Payment */}
      <Dialog
        open={confirmDismissOpen}
        onClose={() => setConfirmDismissOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{isCommission ? 'Dismiss Commission Payment Window?' : 'Dismiss Deposit Window?'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {isCommission
              ? 'Your receiving address remains valid for the duration of the 20-minute countdown. You can reopen this window anytime to complete payment or submit confirmation.'
              : 'Your receiving address remains valid for the duration of the countdown. You can return anytime before it expires to complete your deposit.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDismissOpen(false)}>Stay on Payment</Button>
          <Button onClick={handleConfirmDismiss} variant="contained" color="warning">
            Dismiss Window
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Changing Coin/Network */}
      <Dialog
        open={confirmChangeNetworkOpen}
        onClose={() => setConfirmChangeNetworkOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Change Cryptocurrency or Network?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will discard the current receiving address and return to network selection so you can choose a different cryptocurrency or network.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmChangeNetworkOpen(false)}>Keep Current Address</Button>
          <Button onClick={handleConfirmChangeNetwork} variant="contained" color="primary">
            Change Coin / Network
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
