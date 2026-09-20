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
  InputAdornment,
  Chip,
} from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import { useNetworks, useCryptoRates } from '@/services/crypto'
import type { Asset, NetworkKey } from '@/types/crypto'

interface SettlementInfo {
  traderName?: string
  sessionProfit?: number
  feePercentage?: number
  heldReleasedEquity?: number
}

interface DepositInputStepProps {
  amount: string
  asset: Asset
  network: NetworkKey
  onAmountChange: (amount: string) => void
  onAssetChange: (asset: Asset) => void
  onNetworkChange: (network: NetworkKey) => void
  lockAmount?: boolean
  isCommission?: boolean
  settlementInfo?: SettlementInfo | null
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
  settlementInfo,
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
    if (isCommission) {
      if (asset !== 'BTC') onAssetChange('BTC')
      if (network !== 'BITCOIN') onNetworkChange('BITCOIN')
      return
    }
    if (availableNetworks && availableNetworks.length > 0) {
      const currentValid = availableNetworks.find((n) => n.key === network)
      if (!currentValid) {
        onNetworkChange(availableNetworks[0].key as NetworkKey)
      }
    }
  }, [asset, availableNetworks, network, onNetworkChange, isCommission, onAssetChange])

  if (isCommission) {
    return (
      <Stack spacing={{ xs: 1.5, sm: 2 }}>
        {/* Commission Settlement Receipt Card */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)',
            borderRadius: 2,
            border: 1,
            borderColor: 'primary.light',
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.75 }}
            >
              <LockIcon sx={{ fontSize: 18 }} />
              Commission Settlement Receipt
            </Typography>
            {settlementInfo?.traderName && (
              <Chip
                label={settlementInfo.traderName}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600, height: 24, fontSize: '0.75rem' }}
              />
            )}
          </Box>

          {/* Performance Metrics Micro-Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: { xs: 1, sm: 1.5 },
              p: 1.25,
              bgcolor: 'background.paper',
              borderRadius: 1.5,
              mb: 1.5,
              textAlign: 'center',
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                Closed Profit
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                +${(settlementInfo?.sessionProfit ?? 0).toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                Fee Rate
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {settlementInfo?.feePercentage ?? 20}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                Held in Escrow
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                ${(settlementInfo?.heldReleasedEquity ?? 0).toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {/* Financial Breakdown Rows */}
          <Stack spacing={1} sx={{ px: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Performance Commission:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ${usdAmount.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Blockchain Gas & Network Fee:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                +${vatAmount.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Settlement Asset:
              </Typography>
              <Chip
                label="Bitcoin (BTC) • Native Network"
                size="small"
                sx={{
                  fontWeight: 600,
                  height: 22,
                  fontSize: '0.72rem',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                }}
              />
            </Box>

            <Divider sx={{ my: 0.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Total Due to Send:
              </Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ lineHeight: 1.2 }}>
                  ${totalAmount.toFixed(2)}
                </Typography>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  ≈ {cryptoAmount} BTC
                </Typography>
              </Box>
            </Box>
          </Stack>

          {/* Escrow Release Notice */}
          <Box
            sx={{
              mt: 1.5,
              p: 1.25,
              bgcolor: 'background.paper',
              borderRadius: 1.5,
              border: '1px dashed',
              borderColor: 'primary.light',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
              🔒 <strong>Escrow Release:</strong> Paying this commission unlocks your{' '}
              <strong>${(settlementInfo?.heldReleasedEquity ?? 0).toFixed(2)}</strong> held equity, which will be
              credited directly to your <strong>Copy Trading Wallet</strong> upon admin confirmation.
            </Typography>
          </Box>
        </Box>

        <Alert
          severity="info"
          sx={{
            p: { xs: 1, sm: 1.25 },
            '& .MuiAlert-message': { fontSize: { xs: '0.75rem', sm: '0.8125rem' } },
          }}
        >
          Click <strong>Proceed to Payment</strong> to view your designated Bitcoin receiving address and dynamic
          20-minute payment countdown.
        </Alert>
      </Stack>
    )
  }

  return (
    <Stack spacing={{ xs: 2, sm: 2.5 }}>
      <Typography variant="body2" color="text.secondary">
        Enter the amount you want to deposit in USD. A $5.00 network fee will be added.
      </Typography>

      {/* Amount Input */}
      <Box>
        <TextField
          label="Deposit Amount (USD)"
          value={amount}
          onChange={(e) => {
            if (!lockAmount) {
              onAmountChange(e.target.value)
            }
          }}
          type="number"
          fullWidth
          placeholder="100.00"
          InputProps={{
            readOnly: lockAmount,
            startAdornment: (
              <InputAdornment position="start">
                <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>$</Typography>
              </InputAdornment>
            ),
          }}
          inputProps={{
            min: minAmount,
            step: 0.01,
            inputMode: 'decimal',
          }}
          error={usdAmount > 0 && !isValidAmount}
          helperText={
            usdAmount > 0 && !isValidAmount
              ? `Minimum deposit is $${minAmount.toFixed(2)}`
              : `Minimum: $${minAmount.toFixed(2)}`
          }
        />
      </Box>

      {/* Asset Selection */}
      <FormControl fullWidth size="small">
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
      <FormControl fullWidth size="small" disabled={networksLoading}>
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
        <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'background.default', borderRadius: 2, border: 1, borderColor: 'divider' }}>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Deposit Amount:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ${usdAmount.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Network Fee:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ${vatAmount.toFixed(2)}
              </Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Total Due to Send:
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                ${totalAmount.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, pt: 1, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                You'll send:
              </Typography>
              <Typography variant="body2" fontWeight={700} color="text.primary">
                ≈ {cryptoAmount} {asset}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      <Alert severity="info" sx={{ p: { xs: 1, sm: 1.5 }, '& .MuiAlert-message': { fontSize: { xs: '0.75rem', sm: '0.85rem' } } }}>
        After generating your address, you have 20 minutes to complete payment. Once sent, click "I Have Made Payment" so our admin team can verify it.
      </Alert>
    </Stack>
  )
}

