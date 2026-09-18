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
    if (availableNetworks && availableNetworks.length > 0) {
      const currentValid = availableNetworks.find((n) => n.key === network)
      if (!currentValid) {
        onNetworkChange(availableNetworks[0].key as NetworkKey)
      }
    }
  }, [asset, availableNetworks, network, onNetworkChange])

  return (
    <Stack spacing={{ xs: 2, sm: 2.5 }}>
      {/* Session Settlement Summary Card */}
      {isCommission && settlementInfo && (
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)',
            borderRadius: 2,
            border: 1,
            borderColor: 'primary.light',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LockIcon sx={{ fontSize: 16 }} />
              Session Settlement Details
            </Typography>
            {settlementInfo.traderName && (
              <Chip
                label={settlementInfo.traderName}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600, height: 22, fontSize: '0.72rem' }}
              />
            )}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: { xs: 1, sm: 1.5 },
              p: 1.25,
              bgcolor: 'background.paper',
              borderRadius: 1.5,
              mb: 1.25,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Closed Session Profit
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                +${(settlementInfo.sessionProfit ?? 0).toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Performance Fee
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {settlementInfo.feePercentage ?? 20}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Held Equity to Unlock
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                ${(settlementInfo.heldReleasedEquity ?? 0).toFixed(2)}
              </Typography>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
            Your liquidated equity (${(settlementInfo.heldReleasedEquity ?? 0).toFixed(2)}) is held safely in escrow. Settling this performance commission unlocks your funds and deposits them directly into your <strong>Copy Trading Wallet</strong> upon admin confirmation.
          </Typography>
        </Box>
      )}

      {!isCommission && (
        <Typography variant="body2" color="text.secondary">
          Enter the amount you want to deposit in USD. A $5.00 VAT fee will be added.
        </Typography>
      )}

      {/* Amount Input */}
      <Box>
        <TextField
          label={isCommission ? "Trader Performance Commission (USD)" : "Deposit Amount (USD)"}
          value={amount}
          onChange={(e) => {
            if (!lockAmount) {
              onAmountChange(e.target.value)
            }
          }}
          type="number"
          fullWidth
          placeholder={isCommission ? "0.00" : "100.00"}
          InputProps={{
            readOnly: lockAmount,
            startAdornment: (
              <InputAdornment position="start">
                <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>$</Typography>
              </InputAdornment>
            ),
            endAdornment: lockAmount ? (
              <InputAdornment position="end">
                <Chip
                  icon={<LockIcon sx={{ fontSize: '13px !important' }} />}
                  label="Fixed Commission"
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{
                    fontWeight: 600,
                    height: 24,
                    fontSize: '0.72rem',
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                  }}
                />
              </InputAdornment>
            ) : undefined,
            sx: lockAmount
              ? {
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                  fontWeight: 600,
                  '& input': {
                    color: 'text.primary',
                    cursor: 'default',
                    fontWeight: 600,
                    WebkitTextFillColor: 'unset',
                  },
                }
              : undefined,
          }}
          inputProps={{
            min: minAmount,
            step: 0.01,
            readOnly: lockAmount,
            inputMode: lockAmount ? 'none' : 'decimal',
          }}
          error={usdAmount > 0 && !isValidAmount}
          helperText={
            lockAmount
              ? '🔒 Fixed commission amount: calculated from your closed session profits and cannot be edited.'
              : usdAmount > 0 && !isValidAmount
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
                {isCommission ? 'Trader Performance Commission:' : 'Deposit Amount:'}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ${usdAmount.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {isCommission ? 'Blockchain Network & Gas Fee:' : 'VAT Fee:'}
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

            {isCommission && (
              <Box sx={{ mt: 1, p: 1.25, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', borderRadius: 1.5, border: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                  <strong>Amount Breakdown:</strong> The <strong>${usdAmount.toFixed(2)}</strong> settles the trader's commission fee. The extra <strong>${vatAmount.toFixed(2)}</strong> is the required blockchain network fee for on-chain gas (Total: <strong>${totalAmount.toFixed(2)}</strong>).
                </Typography>
              </Box>
            )}

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
        {isCommission
          ? 'After retrieving the payment address, you have 20 minutes to complete payment. Once sent, click "I Have Made Payment" so our admin team can verify it and release your held funds.'
          : 'After generating your address, you have 20 minutes to complete payment. Once sent, click "I Have Made Payment" so our admin team can verify it.'}
      </Alert>
    </Stack>
  )
}
