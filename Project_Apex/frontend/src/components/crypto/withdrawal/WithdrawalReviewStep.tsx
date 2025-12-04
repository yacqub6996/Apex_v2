/**
 * WithdrawalReviewStep - Review withdrawal details before final submission
 */

import React from 'react'
import {
  Box,
  Stack,
  Typography,
  Paper,
  Divider,
  Button,
  Alert,
} from '@mui/material'
import { useCryptoRates, useNetworks, formatUsdAmount, formatCryptoAmount } from '@/services/crypto'
import type { Asset, NetworkKey } from '@/types/crypto'

interface WithdrawalReviewStepProps {
  formData: {
    asset: Asset
    network: NetworkKey
    amountUsd: number
    address: string
    memo?: string
  }
  onConfirm: () => void
  onBack: () => void
  isSubmitting: boolean
}

export const WithdrawalReviewStep: React.FC<WithdrawalReviewStepProps> = ({
  formData,
  onConfirm,
  onBack,
  isSubmitting,
}) => {
  const { data: rates } = useCryptoRates()
  const { data: networks } = useNetworks()

  const rate = rates?.[formData.asset] || 0
  const cryptoAmount = rate > 0 ? (formData.amountUsd / rate).toFixed(8).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : '0'

  // Get network fee from the networks data
  const selectedNetwork = networks?.find(n => n.key === formData.network)
  // Parse fee estimate (e.g., "~$1" -> 1, "~$5-15" -> 10 average)
  const feeEstimate = selectedNetwork?.fee_estimate || '~$1'
  const feeMatch = feeEstimate.match(/\$(\d+)(?:-(\d+))?/)
  const networkFeeUsd = feeMatch 
    ? feeMatch[2] 
      ? (parseInt(feeMatch[1]) + parseInt(feeMatch[2])) / 2 
      : parseInt(feeMatch[1])
    : 1
  const netAmount = formData.amountUsd - networkFeeUsd

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        Please review your withdrawal details carefully before confirming.
      </Typography>

      {/* Withdrawal Summary */}
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Cryptocurrency
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {formData.asset}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              Network
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {formData.network}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              Destination Address
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                fontSize: '0.875rem',
                mt: 0.5,
              }}
            >
              {formData.address}
            </Typography>
          </Box>

          {formData.memo && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Memo
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                  {formData.memo}
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </Paper>

      {/* Amount Breakdown */}
      <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'background.default' }}>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Withdrawal Amount:</Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatUsdAmount(formData.amountUsd)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Network Fee (est.):
            </Typography>
            <Typography variant="body2" color="text.secondary">
              -{formatUsdAmount(networkFeeUsd)}
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" fontWeight={600}>
              Net Amount:
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatUsdAmount(netAmount)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="body2" color="primary">
              You'll receive:
            </Typography>
            <Typography variant="body2" color="primary" fontWeight={500}>
              ≈ {formatCryptoAmount(cryptoAmount, formData.asset)}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Warnings */}
      <Alert severity="warning">
        <Typography variant="caption" fontWeight={500}>
          Important:
        </Typography>
        <Typography variant="caption" component="ul" sx={{ mt: 0.5, pl: 2 }}>
          <li>Withdrawals require admin verification and may take 5-30 minutes to process.</li>
          <li>Cryptocurrency transactions are irreversible. Ensure your address is correct.</li>
          <li>Network fees are estimated and may vary based on blockchain congestion.</li>
        </Typography>
      </Alert>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2}>
        <Button
          onClick={onBack}
          variant="outlined"
          fullWidth
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Confirm Withdrawal'}
        </Button>
      </Stack>
    </Stack>
  )
}
