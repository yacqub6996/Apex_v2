/**
 * DepositInputStep - Amount and network selection step
 */

import React from 'react'
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
  Alert,
  Divider,
} from '@mui/material'
import { useNetworks, useCryptoRates } from '@/services/crypto'
import type { Asset, NetworkKey } from '@/types/crypto'

interface DepositInputStepProps {
  amount: string
  asset: Asset
  network: NetworkKey
  onAmountChange: (amount: string) => void
  onAssetChange: (asset: Asset) => void
  onNetworkChange: (network: NetworkKey) => void
  lockAmount?: boolean
  isCommission?: boolean
}

const ASSETS: { value: Asset; label: string }[] = [
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'ETH', label: 'Ethereum (ETH)' },
  { value: 'USDT', label: 'Tether (USDT)' },
  { value: 'USDC', label: 'USD Coin (USDC)' },
]

export const DepositInputStep: React.FC<DepositInputStepProps> = ({
  amount,
  asset,
  network,
  onAmountChange,
  onAssetChange,
  onNetworkChange,
  lockAmount = false,
  isCommission = false,
}) => {
  const { data: networks, isLoading: networksLoading } = useNetworks()
  const { data: rates } = useCryptoRates()

  const vatAmount = 5.0
  const usdAmount = parseFloat(amount) || 0
  const totalAmount = usdAmount + vatAmount
  const rate = rates?.[asset] || 0
  const cryptoAmount = rate > 0 ? (totalAmount / rate).toFixed(8).replace(/\.?0+$/, '') : '0'

  const minAmount = isCommission ? 0.01 : 50
  const isValidAmount = usdAmount >= minAmount

  // Filter networks by selected asset
  const availableNetworks = networks?.filter((n) => {
    // Map asset to supported networks
    if (asset === 'BTC') return n.key === 'BITCOIN'
    if (asset === 'ETH') return n.key === 'ETHEREUM_ERC20'
    if (asset === 'USDT') return ['TRON_TRC20', 'ETHEREUM_ERC20', 'POLYGON'].includes(n.key)
    if (asset === 'USDC') return ['POLYGON', 'ETHEREUM_ERC20'].includes(n.key)
    return false
  })

  // Auto-select first available network when asset changes
  React.useEffect(() => {
    if (availableNetworks && availableNetworks.length > 0) {
      const currentValid = availableNetworks.find((n) => n.key === network)
      if (!currentValid) {
        onNetworkChange(availableNetworks[0].key as NetworkKey)
      }
    }
  }, [asset, availableNetworks, network, onNetworkChange])

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        {isCommission
          ? 'This deposit pays trader commission. A $5 network fee will be added.'
          : 'Enter the amount you want to deposit in USD. A $5 VAT fee will be added.'}
      </Typography>

      {/* Amount Input */}
      <Box>
        <TextField
          label={isCommission ? "Trader Commission (USD)" : "Deposit Amount (USD)"}
          value={amount}
          onChange={(e) => {
            if (!lockAmount) {
              onAmountChange(e.target.value)
            }
          }}
          type="number"
          fullWidth
          disabled={lockAmount}
          placeholder={isCommission ? "0.00" : "100.00"}
          InputProps={{
            readOnly: lockAmount,
          }}
          inputProps={{
            min: minAmount,
            step: 0.01,
            readOnly: lockAmount,
          }}
          error={usdAmount > 0 && !isValidAmount}
          helperText={
            lockAmount
              ? 'Trader commission amount is fixed based on your copy trading session profit.'
              : usdAmount > 0 && !isValidAmount
              ? `Minimum deposit is $${minAmount.toFixed(2)}`
              : `Minimum: $${minAmount.toFixed(2)}`
          }
        />
      </Box>

      {/* Asset Selection */}
      <FormControl fullWidth>
        <InputLabel>Cryptocurrency</InputLabel>
        <Select
          value={asset}
          label="Cryptocurrency"
          onChange={(e) => onAssetChange(e.target.value as Asset)}
        >
          {ASSETS.map((a) => (
            <MenuItem key={a.value} value={a.value}>
              {a.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Network Selection */}
      <FormControl fullWidth disabled={networksLoading}>
        <InputLabel>Network</InputLabel>
        <Select
          value={network}
          label="Network"
          onChange={(e) => onNetworkChange(e.target.value as NetworkKey)}
        >
          {availableNetworks?.map((n) => (
            <MenuItem key={n.key} value={n.key}>
              <Box>
                <Typography variant="body2">{n.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Fee: {n.fee_estimate} • Time: {n.confirmation_time}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Summary */}
      {isValidAmount && (
        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">{isCommission ? 'Commission Amount:' : 'Amount:'}</Typography>
              <Typography variant="body2" fontWeight={500}>
                ${usdAmount.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">VAT Fee:</Typography>
              <Typography variant="body2" fontWeight={500}>
                ${vatAmount.toFixed(2)}
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={600}>
                Total:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ${totalAmount.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                You'll send:
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                ≈ {cryptoAmount} {asset}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        After generating your deposit address, you'll have 20 minutes to send the payment.
        Once sent, click "I Have Made Payment" to notify our team for verification.
      </Alert>
    </Stack>
  )
}
