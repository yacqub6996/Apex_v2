/**
 * WithdrawalInputStep - Withdrawal form with asset, network, amount, and address input
 */

import React, { useState, useEffect } from 'react'
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
  Button,
  FormHelperText,
  Chip,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useNetworks, useCryptoRates, detectNetworkFromAddress } from '@/services/crypto'
import { useMemoRequirement } from '@/hooks/useWithdrawal'
import type { Asset, NetworkKey } from '@/types/crypto'

export type WalletType = 'main' | 'copy' | 'long-term'

interface WithdrawalInputStepProps {
  onSubmit: (data: {
    asset: Asset
    network: NetworkKey
    amountUsd: number
    address: string
    memo?: string
  }) => boolean
  addressError: string | null
  disabled?: boolean
  walletType?: WalletType
  availableBalance?: number
}

const ASSETS: { value: Asset; label: string }[] = [
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'ETH', label: 'Ethereum (ETH)' },
  { value: 'USDT', label: 'Tether (USDT)' },
  { value: 'USDC', label: 'USD Coin (USDC)' },
]

export const WithdrawalInputStep: React.FC<WithdrawalInputStepProps> = ({
  onSubmit,
  addressError,
  disabled = false,
  walletType = 'main',
  availableBalance = 0,
}) => {
  const [asset, setAsset] = useState<Asset>('USDT')
  const [network, setNetwork] = useState<NetworkKey>('TRON_TRC20')
  const [amount, setAmount] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [memo, setMemo] = useState<string>('')
  const [networkAutoDetected, setNetworkAutoDetected] = useState<boolean>(false)

  const { data: networks, isLoading: networksLoading } = useNetworks()
  const { data: rates } = useCryptoRates()
  const { requiresMemo, memoLabel } = useMemoRequirement(network)

  const usdAmount = parseFloat(amount) || 0
  const rate = rates?.[asset] || 0
  const cryptoAmount = rate > 0 ? (usdAmount / rate).toFixed(8).replace(/\.?0+$/, '') : '0'

  // Filter networks by selected asset
  const availableNetworks = networks?.filter((n) => {
    if (asset === 'BTC') return n.key === 'BITCOIN'
    if (asset === 'ETH') return n.key === 'ETHEREUM_ERC20'
    if (asset === 'USDT') return ['TRON_TRC20', 'ETHEREUM_ERC20', 'POLYGON'].includes(n.key)
    if (asset === 'USDC') return ['POLYGON', 'ETHEREUM_ERC20'].includes(n.key)
    return false
  })

  // Auto-select first available network when asset changes
  useEffect(() => {
    if (availableNetworks && availableNetworks.length > 0) {
      const currentValid = availableNetworks.find((n) => n.key === network)
      if (!currentValid) {
        setNetwork(availableNetworks[0].key as NetworkKey)
        setNetworkAutoDetected(false)
      }
    }
  }, [asset, availableNetworks, network])

  // Auto-detect network from address format
  useEffect(() => {
    if (address.trim()) {
      const detectedNetwork = detectNetworkFromAddress(address, asset)
      if (detectedNetwork && availableNetworks?.some((n) => n.key === detectedNetwork)) {
        setNetwork(detectedNetwork as NetworkKey)
        setNetworkAutoDetected(true)
      } else {
        setNetworkAutoDetected(false)
      }
    } else {
      setNetworkAutoDetected(false)
    }
  }, [address, asset, availableNetworks, setNetwork])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const success = onSubmit({
      asset,
      network,
      amountUsd: usdAmount,
      address: address.trim(),
      memo: memo.trim() || undefined,
    })

    if (!success) {
      // Form validation failed
    }
  }

  const isValidAmount = usdAmount > 0
  const isValidAddress = address.trim().length > 0
  const isValidMemo = !requiresMemo || memo.trim().length > 0
  const canSubmit = isValidAmount && isValidAddress && isValidMemo && !disabled

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const walletLabel = walletType === 'copy' ? 'Copy Trading Wallet' : 
                      walletType === 'long-term' ? 'Long-Term Wallet' : 
                      'Main Wallet'

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Typography variant="body2" color="text.secondary">
          Enter the withdrawal details. Your funds will be sent to the specified address after admin verification.
        </Typography>

        {/* Available Balance Display */}
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: 'action.hover', 
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {walletLabel} Balance
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {formatCurrency(availableBalance)}
          </Typography>
        </Box>

        {/* Asset Selection */}
        <FormControl fullWidth disabled={disabled}>
          <InputLabel>Cryptocurrency</InputLabel>
          <Select
            value={asset}
            label="Cryptocurrency"
            onChange={(e) => setAsset(e.target.value as Asset)}
          >
            {ASSETS.map((a) => (
              <MenuItem key={a.value} value={a.value}>
                {a.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Network Selection */}
        <FormControl fullWidth disabled={networksLoading || disabled}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <InputLabel shrink={!!network || networkAutoDetected}>Network</InputLabel>
            {networkAutoDetected && (
              <Chip
                label="Auto-detected"
                size="small"
                color="success"
                icon={<CheckCircleIcon />}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
          <Select
            value={network}
            label="Network"
            onChange={(e) => {
              setNetwork(e.target.value as NetworkKey)
              setNetworkAutoDetected(false) // User manually changed
            }}
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
          <FormHelperText>
            {networkAutoDetected
              ? 'Network auto-detected from address format. You can change it if needed.'
              : 'Choose the network carefully. Sending to the wrong network may result in loss of funds.'}
          </FormHelperText>
        </FormControl>

        {/* Amount Input */}
        <Box>
          <TextField
            label="Withdrawal Amount (USD)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            fullWidth
            required
            placeholder="0.00"
            inputProps={{
              min: 0,
              step: 0.01,
            }}
            disabled={disabled}
            helperText={
              isValidAmount
                ? `You will receive approximately ${cryptoAmount} ${asset}`
                : 'Enter amount in USD'
            }
          />
        </Box>

        {/* Address Input */}
        <Box>
          <TextField
            label="Destination Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
            required
            placeholder={`Enter ${asset} address`}
            error={!!addressError}
            helperText={addressError || 'Paste your wallet address here'}
            disabled={disabled}
            inputProps={{
              style: { fontFamily: 'monospace', fontSize: '0.875rem' },
            }}
          />
        </Box>

        {/* Memo Input (conditional) */}
        {requiresMemo && (
          <Box>
            <TextField
              label={`${memoLabel} (Required)`}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              fullWidth
              required
              placeholder={`Enter ${memoLabel.toLowerCase()}`}
              disabled={disabled}
              helperText={`This ${memoLabel.toLowerCase()} is required for ${asset} on ${network}`}
            />
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="caption">
                <strong>Important:</strong> Without the correct {memoLabel.toLowerCase()}, your withdrawal may fail or be delayed.
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Warning Alert */}
        <Alert severity="warning">
          <Typography variant="caption">
            <strong>Double-check your address!</strong> Cryptocurrency transactions are irreversible. 
            Sending to the wrong address or network will result in permanent loss of funds.
          </Typography>
        </Alert>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={!canSubmit}
        >
          Review Withdrawal
        </Button>
      </Stack>
    </Box>
  )
}
