import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Switch,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import SaveIcon from '@mui/icons-material/Save'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { AdminService } from '@/api/services/AdminService'
import type { CryptoDepositAddressPublic } from '@/api/models/CryptoDepositAddressPublic'
import type { CryptoDepositAddressCreate } from '@/api/models/CryptoDepositAddressCreate'
import { QRCode } from '@/components/shared-assets/qr-code'
import { validateAddress } from '@/services/crypto'
import { extractApiErrorMessage } from '@/utils/errors'
import { toast } from 'react-toastify'

const NETWORK_LABELS: Record<string, string> = {
  BITCOIN: 'Bitcoin (Native / SegWit / Legacy)',
  ETHEREUM_ERC20: 'Ethereum (ERC20)',
  TRON_TRC20: 'TRON (TRC20)',
  POLYGON: 'Polygon (POS)',
  SOLANA: 'Solana (Native)',
  RIPPLE: 'Ripple (XRP Ledger)',
  BSC_BEP20: 'BNB Smart Chain (BEP20)',
  LITECOIN: 'Litecoin (Native)',
  DOGECOIN: 'Dogecoin (Native)',
  TON: 'The Open Network (TON)',
  ARBITRUM: 'Arbitrum One',
  AVAX_C: 'Avalanche C-Chain',
  OPTIMISM: 'Optimism (OP)',
  BASE: 'Base',
}

interface CoinPreset {
  key: string
  label: string
  coin: string
  name: string
  network: string
  coingeckoId: string
  fallbackRate: number
  requiresMemo: boolean
  placeholder: string
}

const PRESETS: CoinPreset[] = [
  {
    key: 'SOL',
    label: 'Solana (SOL - Native)',
    coin: 'SOL',
    name: 'Solana',
    network: 'SOLANA',
    coingeckoId: 'solana',
    fallbackRate: 150.0,
    requiresMemo: false,
    placeholder: 'e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  },
  {
    key: 'XRP',
    label: 'Ripple (XRP - Destination Tag Required)',
    coin: 'XRP',
    name: 'Ripple',
    network: 'RIPPLE',
    coingeckoId: 'ripple',
    fallbackRate: 0.6,
    requiresMemo: true,
    placeholder: 'e.g. rDsbeomaeKStUQaoWqYPP586NQ3eL22G5',
  },
  {
    key: 'BNB',
    label: 'BNB / Binance (BEP20)',
    coin: 'BNB',
    name: 'Binance Coin',
    network: 'BSC_BEP20',
    coingeckoId: 'binancecoin',
    fallbackRate: 580.0,
    requiresMemo: false,
    placeholder: 'e.g. 0x1234567890abcdef...',
  },
  {
    key: 'USDT_BSC',
    label: 'USDT (Tether on BEP20)',
    coin: 'USDT',
    name: 'Tether (BEP20)',
    network: 'BSC_BEP20',
    coingeckoId: 'tether',
    fallbackRate: 1.0,
    requiresMemo: false,
    placeholder: 'e.g. 0x1234567890abcdef...',
  },
  {
    key: 'DOGE',
    label: 'Dogecoin (DOGE - Native)',
    coin: 'DOGE',
    name: 'Dogecoin',
    network: 'DOGECOIN',
    coingeckoId: 'dogecoin',
    fallbackRate: 0.12,
    requiresMemo: false,
    placeholder: 'e.g. D7Y5DzsYUEpvnYmQk4zGP9sWWc...',
  },
  {
    key: 'LTC',
    label: 'Litecoin (LTC - Native)',
    coin: 'LTC',
    name: 'Litecoin',
    network: 'LITECOIN',
    coingeckoId: 'litecoin',
    fallbackRate: 70.0,
    requiresMemo: false,
    placeholder: 'e.g. L... / M... / ltc1...',
  },
  {
    key: 'TON',
    label: 'Toncoin (TON - Memo Required)',
    coin: 'TON',
    name: 'Toncoin',
    network: 'TON',
    coingeckoId: 'the-open-network',
    fallbackRate: 5.5,
    requiresMemo: true,
    placeholder: 'e.g. EQCD39VS5jcptHL8vMjEXrzGaRc...',
  },
  {
    key: 'AVAX',
    label: 'Avalanche (AVAX - C-Chain)',
    coin: 'AVAX',
    name: 'Avalanche',
    network: 'AVAX_C',
    coingeckoId: 'avalanche-2',
    fallbackRate: 28.0,
    requiresMemo: false,
    placeholder: 'e.g. 0x1234567890abcdef...',
  },
]

interface WalletEditorCardProps {
  item: CryptoDepositAddressPublic
  onSave: (payload: {
    id: string
    address: string
    memo: string | null
    isActive: boolean
    notes: string
    displayName?: string
    coingeckoId?: string
    fallbackRate?: number
  }) => Promise<void>
  isSaving: boolean
}

const WalletEditorCard: React.FC<WalletEditorCardProps> = ({ item, onSave, isSaving }) => {
  const [addressInput, setAddressInput] = useState(item.address)
  const [memoInput, setMemoInput] = useState(item.memo || '')
  const [isActive, setIsActive] = useState<boolean>(Boolean(item.is_active))
  const [notesInput, setNotesInput] = useState(item.notes || '')
  const [displayNameInput, setDisplayNameInput] = useState(item.display_name || '')
  const [coingeckoIdInput, setCoingeckoIdInput] = useState(item.coingecko_id || '')
  const [fallbackRateInput, setFallbackRateInput] = useState(item.fallback_rate ? String(item.fallback_rate) : '')
  const [showQr, setShowQr] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Validation
  const validation = useMemo(() => {
    return validateAddress(addressInput, item.network)
  }, [addressInput, item.network])

  const hasChanges =
    addressInput.trim() !== item.address.trim() ||
    memoInput.trim() !== (item.memo || '').trim() ||
    isActive !== Boolean(item.is_active) ||
    notesInput.trim() !== (item.notes || '').trim() ||
    displayNameInput.trim() !== (item.display_name || '').trim() ||
    coingeckoIdInput.trim() !== (item.coingecko_id || '').trim() ||
    fallbackRateInput.trim() !== (item.fallback_rate ? String(item.fallback_rate) : '').trim()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(addressInput)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // noop
    }
  }

  const handleInitiateSave = () => {
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid address format')
      return
    }
    setConfirmOpen(true)
  }

  const handleExecuteSave = async () => {
    setConfirmOpen(false)
    const parsedRate = fallbackRateInput.trim() ? parseFloat(fallbackRateInput.trim()) : undefined
    await onSave({
      id: item.id,
      address: addressInput.trim(),
      memo: memoInput.trim() ? memoInput.trim() : null,
      isActive: Boolean(isActive),
      notes: notesInput.trim(),
      displayName: displayNameInput.trim() || undefined,
      coingeckoId: coingeckoIdInput.trim() || undefined,
      fallbackRate: Number.isFinite(parsedRate) ? parsedRate : undefined,
    })
  }

  const networkName = NETWORK_LABELS[item.network] || item.network

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: hasChanges ? 'primary.main' : 'divider',
          boxShadow: hasChanges ? '0 0 0 1px #3b82f6' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  {item.display_name ? `${item.display_name} (${item.coin})` : item.coin}
                </Typography>
                <Chip
                  label={networkName}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {item.fallback_rate && (
                  <Chip
                    label={`Rate: $${item.fallback_rate}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                <Chip
                  label={isActive ? 'Active' : 'Inactive'}
                  color={isActive ? 'success' : 'default'}
                  size="small"
                />
                <IconButton
                  size="small"
                  onClick={() => setShowQr(!showQr)}
                  title={showQr ? 'Hide QR Code' : 'Preview QR Code'}
                  color={showQr ? 'primary' : 'default'}
                >
                  <QrCode2Icon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          }
          sx={{ pb: 1 }}
        />
        <CardContent sx={{ pt: 1 }}>
          <Stack spacing={2}>
            {showQr && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <QRCode value={addressInput || item.address} size="md" />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Scan to verify receiving address in your wallet app
                </Typography>
              </Box>
            )}

            {/* Display Name */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                Display Name (User Facing)
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder="e.g. Solana, Bitcoin"
              />
            </Box>

            {/* Receiving Address */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                Platform Receiving Address
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                error={Boolean(addressInput && !validation.valid)}
                helperText={addressInput && !validation.valid ? validation.error : ''}
                placeholder="Enter deposit address..."
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                        <IconButton size="small" onClick={handleCopy}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Memo / Tag (Optional) */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                Memo / Destination Tag (Optional)
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={memoInput}
                onChange={(e) => setMemoInput(e.target.value)}
                placeholder="Leave blank if not applicable"
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
              />
            </Box>

            {/* Price & CoinGecko Metadata Row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                  Fallback USD Rate
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={fallbackRateInput}
                  onChange={(e) => setFallbackRateInput(e.target.value)}
                  placeholder="e.g. 150.00"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                  CoinGecko ID (Live Pricing)
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={coingeckoIdInput}
                  onChange={(e) => setCoingeckoIdInput(e.target.value)}
                  placeholder="e.g. solana, ripple"
                />
              </Box>
            </Box>

            {/* Notes / Reason for change */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                Internal Audit Note / Label
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="e.g. Primary BitGo custody hot wallet"
              />
            </Box>

            {/* Active Toggle & Metadata */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <FormControlLabel
                control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} size="small" />}
                label={<Typography variant="body2">Accept Deposits</Typography>}
              />
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Last modified:{' '}
                  {item.updated_at
                    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(
                        new Date(item.updated_at)
                      )
                    : 'N/A'}
                </Typography>
                {item.updated_by_email && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    by {item.updated_by_email}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Action Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                disabled={!hasChanges || !validation.valid || isSaving}
                onClick={handleInitiateSave}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirm Deposit Address Update
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="warning">
              Updating this address will immediately direct all future customer deposits for{' '}
              <strong>
                {item.display_name || item.coin} ({networkName})
              </strong>{' '}
              to the updated configuration.
            </Alert>

            <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Previous Address:
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', wordBreak: 'break-all', color: 'text.secondary' }}
              >
                {item.address}
              </Typography>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                New Receiving Address:
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', wordBreak: 'break-all', color: 'primary.main' }}>
                {addressInput}
              </Typography>
            </Box>

            <Typography variant="body2">
              Please double check that your wallet application has full custody of this destination.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleExecuteSave} variant="contained" color="primary" autoFocus>
            Confirm & Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

interface AddCoinDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (payload: CryptoDepositAddressCreate) => Promise<void>
  isAdding: boolean
}

const AddCoinDialog: React.FC<AddCoinDialogProps> = ({ open, onClose, onAdd, isAdding }) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('SOL')
  const [coin, setCoin] = useState<string>('SOL')
  const [displayName, setDisplayName] = useState<string>('Solana')
  const [network, setNetwork] = useState<string>('SOLANA')
  const [address, setAddress] = useState<string>('')
  const [memo, setMemo] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [coingeckoId, setCoingeckoId] = useState<string>('solana')
  const [fallbackRate, setFallbackRate] = useState<string>('150.0')
  const [requiresMemo, setRequiresMemo] = useState<boolean>(false)

  // Handle Preset selection
  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey)
    if (presetKey === 'CUSTOM') {
      setCoin('')
      setDisplayName('')
      setNetwork('')
      setAddress('')
      setMemo('')
      setCoingeckoId('')
      setFallbackRate('')
      setRequiresMemo(false)
      return
    }

    const p = PRESETS.find((item) => item.key === presetKey)
    if (p) {
      setCoin(p.coin)
      setDisplayName(p.name)
      setNetwork(p.network)
      setCoingeckoId(p.coingeckoId)
      setFallbackRate(String(p.fallbackRate))
      setRequiresMemo(p.requiresMemo)
      setAddress('')
      setMemo('')
    }
  }

  const validation = useMemo(() => {
    if (!address.trim()) return { valid: false, error: 'Address is required' }
    return validateAddress(address, network)
  }, [address, network])

  const handleSubmit = async () => {
    if (!coin.trim() || !network.trim() || !address.trim()) {
      toast.error('Coin symbol, network, and address are required')
      return
    }
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid address format')
      return
    }

    const parsedRate = fallbackRate.trim() ? parseFloat(fallbackRate.trim()) : undefined

    await onAdd({
      coin: coin.trim().toUpperCase(),
      network: network.trim().toUpperCase(),
      address: address.trim(),
      memo: memo.trim() ? memo.trim() : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      display_name: displayName.trim() ? displayName.trim() : undefined,
      coingecko_id: coingeckoId.trim() ? coingeckoId.trim() : undefined,
      fallback_rate: Number.isFinite(parsedRate) ? parsedRate : undefined,
      is_active: true,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AddCircleOutlineIcon color="primary" />
        Add New Cryptocurrency / Receiving Wallet
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* Preset selector */}
          <FormControl fullWidth size="small">
            <InputLabel id="preset-select-label">Choose Preset or Custom</InputLabel>
            <Select
              labelId="preset-select-label"
              value={selectedPreset}
              label="Choose Preset or Custom"
              onChange={(e) => handlePresetChange(e.target.value)}
            >
              {PRESETS.map((p) => (
                <MenuItem key={p.key} value={p.key}>
                  {p.label}
                </MenuItem>
              ))}
              <MenuItem value="CUSTOM">
                <em>Custom / Arbitrary Coin & Network</em>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Coin & Display Name */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 1.5 }}>
            <TextField
              label="Symbol (e.g. SOL)"
              size="small"
              value={coin}
              onChange={(e) => setCoin(e.target.value.toUpperCase())}
              placeholder="SOL"
              required
            />
            <TextField
              label="Display Name (e.g. Solana)"
              size="small"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Solana"
            />
          </Box>

          {/* Network Key */}
          <TextField
            label="Network Key (e.g. SOLANA, BSC_BEP20, RIPPLE)"
            size="small"
            fullWidth
            value={network}
            onChange={(e) => setNetwork(e.target.value.toUpperCase())}
            placeholder="SOLANA"
            helperText="Internal network identifier used by Apex"
            required
          />

          {/* Receiving Address */}
          <Box>
            <TextField
              label="Receiving Address"
              size="small"
              fullWidth
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={Boolean(address && !validation.valid)}
              helperText={address && !validation.valid ? validation.error : 'Custody address that will receive customer deposits'}
              placeholder="Enter receiving address..."
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
              required
            />
          </Box>

          {/* Memo / Tag */}
          <Box>
            <TextField
              label="Memo / Destination Tag (Optional)"
              size="small"
              fullWidth
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={requiresMemo ? 'e.g. 100293847' : 'Leave blank if not needed'}
              helperText={requiresMemo ? 'This network typically requires a Destination Tag or Memo' : 'Leave empty for automated per-user tags'}
            />
          </Box>

          {/* Price & CoinGecko */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            <TextField
              label="Fallback USD Rate"
              size="small"
              type="number"
              value={fallbackRate}
              onChange={(e) => setFallbackRate(e.target.value)}
              placeholder="150.00"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              helperText="Used if live price lookup is unavailable"
            />
            <TextField
              label="CoinGecko ID (Optional)"
              size="small"
              value={coingeckoId}
              onChange={(e) => setCoingeckoId(e.target.value)}
              placeholder="solana"
              helperText="Used for live price updates from CoinGecko"
            />
          </Box>

          {/* Notes */}
          <TextField
            label="Internal Notes / Hot Wallet Label"
            size="small"
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Fireblocks / Ledger primary deposit account"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isAdding}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!coin.trim() || !network.trim() || !address.trim() || !validation.valid || isAdding}
        >
          {isAdding ? 'Adding...' : 'Add Coin / Wallet'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export const AdminCryptoWalletsManager: React.FC = () => {
  const queryClient = useQueryClient()
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-crypto-addresses'],
    queryFn: () => AdminService.adminGetAllDepositAddresses(),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string
      address: string
      memo: string | null
      isActive: boolean
      notes: string
      displayName?: string
      coingeckoId?: string
      fallbackRate?: number
    }) =>
      AdminService.adminUpdateDepositAddress(payload.id, {
        address: payload.address,
        memo: payload.memo,
        is_active: payload.isActive,
        notes: payload.notes,
        display_name: payload.displayName,
        coingecko_id: payload.coingeckoId,
        fallback_rate: payload.fallbackRate,
      }),
    onSuccess: (updated) => {
      toast.success(`Successfully updated ${updated.display_name || updated.coin} (${updated.network})!`)
      queryClient.invalidateQueries({ queryKey: ['admin-crypto-addresses'] })
      queryClient.invalidateQueries({ queryKey: ['crypto'] })
    },
    onError: (err: unknown) => {
      toast.error(extractApiErrorMessage(err, 'Failed to update deposit address'))
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: CryptoDepositAddressCreate) =>
      AdminService.adminCreateDepositAddress(payload),
    onSuccess: (created) => {
      toast.success(`Successfully added ${created.display_name || created.coin} (${created.network})!`)
      setAddDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-crypto-addresses'] })
      queryClient.invalidateQueries({ queryKey: ['crypto'] })
    },
    onError: (err: unknown) => {
      toast.error(extractApiErrorMessage(err, 'Failed to add deposit address'))
    },
  })

  const handleSave = async (payload: {
    id: string
    address: string
    memo: string | null
    isActive: boolean
    notes: string
    displayName?: string
    coingeckoId?: string
    fallbackRate?: number
  }) => {
    await updateMutation.mutateAsync(payload)
  }

  const handleAdd = async (payload: CryptoDepositAddressCreate) => {
    await createMutation.mutateAsync(payload)
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {extractApiErrorMessage(error, 'Failed to load platform deposit addresses')}
      </Alert>
    )
  }

  const addresses = data?.data || []

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Platform Deposit Wallets ({addresses.length})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure receiving addresses and coins accepted across the customer deposit experience.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Coin / Wallet
        </Button>
      </Box>

      <Alert severity="info" icon={<CheckCircleOutlineIcon fontSize="inherit" />}>
        Customer deposit flows automatically reflect any active cryptocurrency configured here with live CoinGecko pricing and your fallback USD conversion rates.
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        {addresses.map((item) => (
          <WalletEditorCard
            key={item.id}
            item={item}
            onSave={handleSave}
            isSaving={updateMutation.isPending}
          />
        ))}
      </Box>

      <AddCoinDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAdd}
        isAdding={createMutation.isPending}
      />
    </Stack>
  )
}
