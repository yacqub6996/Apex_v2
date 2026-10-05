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
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import SaveIcon from '@mui/icons-material/Save'
import { AdminService } from '@/api/services/AdminService'
import type { CryptoDepositAddressPublic } from '@/api/models/CryptoDepositAddressPublic'
import { QRCode } from '@/components/shared-assets/qr-code'
import { validateAddress } from '@/services/crypto'
import { extractApiErrorMessage } from '@/utils/errors'
import { toast } from 'react-toastify'

const NETWORK_LABELS: Record<string, string> = {
  BITCOIN: 'Bitcoin (Native / SegWit / Legacy)',
  ETHEREUM_ERC20: 'Ethereum (ERC20)',
  TRON_TRC20: 'TRON (TRC20)',
  POLYGON: 'Polygon (POS)',
}

interface WalletEditorCardProps {
  item: CryptoDepositAddressPublic
  onSave: (id: string, address: string, memo: string | null, isActive: boolean, notes: string) => Promise<void>
  isSaving: boolean
}

const WalletEditorCard: React.FC<WalletEditorCardProps> = ({ item, onSave, isSaving }) => {
  const [addressInput, setAddressInput] = useState(item.address)
  const [memoInput, setMemoInput] = useState(item.memo || '')
  const [isActive, setIsActive] = useState<boolean>(Boolean(item.is_active))
  const [notesInput, setNotesInput] = useState(item.notes || '')
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
    notesInput.trim() !== (item.notes || '').trim()

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
    await onSave(
      item.id,
      addressInput.trim(),
      memoInput.trim() ? memoInput.trim() : null,
      Boolean(isActive),
      notesInput.trim()
    )
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
                  {item.coin}
                </Typography>
                <Chip
                  label={networkName}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                {isSaving ? 'Saving...' : 'Save Address'}
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
                {item.coin} ({networkName})
              </strong>{' '}
              to the new destination wallet.
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
              Please double check that your wallet application has full custody of this address.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleExecuteSave} variant="contained" color="primary" autoFocus>
            Confirm & Save Address
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export const AdminCryptoWalletsManager: React.FC = () => {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-crypto-addresses'],
    queryFn: () => AdminService.adminGetAllDepositAddresses(),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      address,
      memo,
      isActive,
      notes,
    }: {
      id: string
      address: string
      memo: string | null
      isActive: boolean
      notes: string
    }) =>
      AdminService.adminUpdateDepositAddress(id, {
        address,
        memo,
        is_active: isActive,
        notes,
      }),
    onSuccess: (updated) => {
      toast.success(`Successfully updated ${updated.coin} (${updated.network}) deposit address!`)
      queryClient.invalidateQueries({ queryKey: ['admin-crypto-addresses'] })
    },
    onError: (err: unknown) => {
      toast.error(extractApiErrorMessage(err, 'Failed to update deposit address'))
    },
  })

  const handleSave = async (
    id: string,
    address: string,
    memo: string | null,
    isActive: boolean,
    notes: string
  ) => {
    await updateMutation.mutateAsync({ id, address, memo, isActive, notes })
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
      <Alert severity="info" icon={<CheckCircleOutlineIcon fontSize="inherit" />}>
        These addresses receive customer cryptocurrency deposits across the Apex platform. Updates apply immediately to
        all new payment sessions and QR codes.
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
    </Stack>
  )
}
