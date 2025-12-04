/**
 * AdminBalanceOverride - Superuser component for directly setting user balances
 * 
 * Features:
 * - Set any balance field directly (wallet, copy, long-term, or total)
 * - No validation limits (accepts negative, large numbers, decimals)
 * - Instant recomputation of dependent balances
 * - Audit logging via ledger entries
 * - Preview delta with color coding (green for increase, red for decrease)
 * 
 * Design: C1 geometry (12px radius), T2 density, L3 surfaces
 */

import React, { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CircularProgress,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UsersService } from '@/api/services/UsersService'
import { AdminLedgerService } from '@/services/admin-ledger-service'
import { toast } from 'react-toastify'
import type { BalanceField, BalanceOverrideRequest } from '@/types/ledger'

interface AdminBalanceOverrideProps {
  preselectedUserId?: string
  onSuccess?: () => void
}

export const AdminBalanceOverride: React.FC<AdminBalanceOverrideProps> = ({
  preselectedUserId,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState<string>(preselectedUserId || '')
  const [balanceField, setBalanceField] = useState<BalanceField>('wallet')
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  // Fetch users for autocomplete
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => UsersService.usersReadUsers(0, 1000),
  })

  const users = usersQuery.data?.data ?? []
  const selectedUser = users.find((u) => u.id === selectedUserId)

  // Get current balance values
  const currentWalletBalance = selectedUser?.wallet_balance ?? 0
  const currentCopyWalletBalance = selectedUser?.copy_trading_wallet_balance ?? 0
  const currentLongTermWalletBalance = selectedUser?.long_term_wallet_balance ?? 0
  // Note: UserPublic doesn't have allocated_copy_balance and total_balance
  // These would need to be calculated or retrieved from a different endpoint
  const currentAllocatedCopy = 0 // Placeholder - needs proper calculation
  const currentTotalBalance = currentWalletBalance + currentCopyWalletBalance + currentLongTermWalletBalance

  // Calculate current value of selected field
  const getCurrentValue = (): number => {
    switch (balanceField) {
      case 'wallet':
        return currentWalletBalance
      case 'copy_wallet':
        return currentCopyWalletBalance
      case 'long_term_wallet':
        return currentLongTermWalletBalance
      case 'total':
        return currentTotalBalance
      default:
        return 0
    }
  }

  const currentValue = getCurrentValue()
  const newValueNum = parseFloat(newValue) || 0
  const delta = newValueNum - currentValue

  // Calculate what the new total will be
  const calculateNewTotal = (): number => {
    if (balanceField === 'total') {
      return newValueNum
    }
    // For individual wallets, recalculate total
    const wallet = balanceField === 'wallet' ? newValueNum : currentWalletBalance
    const copyWallet = balanceField === 'copy_wallet' ? newValueNum : currentCopyWalletBalance
    const longTermWallet = balanceField === 'long_term_wallet' ? newValueNum : currentLongTermWalletBalance
    return wallet + copyWallet + longTermWallet + currentAllocatedCopy
  }

  const newTotal = calculateNewTotal()

  // Override mutation using the AdminLedgerService
  const overrideMutation = useMutation({
    mutationFn: (data: BalanceOverrideRequest) => AdminLedgerService.overrideBalance(data),
    onSuccess: () => {
      // Comprehensive query invalidation for instant sync across all dashboards
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      queryClient.invalidateQueries({ queryKey: ['users-me'] })
      queryClient.invalidateQueries({ queryKey: ['user', selectedUserId] })
      queryClient.invalidateQueries({ queryKey: ['ledger-entries'] })
      queryClient.invalidateQueries({ queryKey: ['ledger-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['account-summary', selectedUserId] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['admin-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['copied-traders'] })

      toast.success('Balance override successful. All dashboards updated.')
      setConfirmDialogOpen(false)

      // Reset form
      if (!preselectedUserId) {
        setSelectedUserId('')
      }
      setNewValue('')
      setReason('')
      setLocalError(null)
      onSuccess?.()
    },
    onError: (error: any) => {
      const errorMsg = error?.message || 'Failed to override balance'
      setLocalError(errorMsg)
      toast.error(errorMsg)
      setConfirmDialogOpen(false)
    },
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const formatDelta = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${formatCurrency(value)}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    // Minimal validation
    if (!selectedUserId) {
      setLocalError('Please select a user')
      return
    }

    if (newValue.trim() === '') {
      setLocalError('Please enter a new balance value')
      return
    }

    const newValueNum = parseFloat(newValue)
    if (!Number.isFinite(newValueNum)) {
      setLocalError('Please enter a valid number')
      return
    }

    if (!reason.trim()) {
      setLocalError('Please provide a reason for this override')
      return
    }

    // Show confirmation dialog
    setConfirmDialogOpen(true)
  }

  const handleConfirmOverride = () => {
    const newValueNum = parseFloat(newValue)
    
    // Submit override
    overrideMutation.mutate({
      user_id: selectedUserId,
      balance_field: balanceField,
      new_value: newValueNum,
      reason: reason.trim(),
    })
  }

  const isSubmitting = overrideMutation.isPending

  return (
    <Card
      sx={{
        borderRadius: 3, // C1 geometry (12px = 1.5 * 8px)
        boxShadow: 1, // L3 surface model
        transition: 'box-shadow 0.12s ease-in-out',
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            ⚠️ Superuser Balance Override
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Directly set any user balance with no validation limits. All changes are logged.
          </Typography>

          {localError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>
              {localError}
            </Alert>
          )}

          <Stack spacing={3}>
            {/* User Selection */}
            <Autocomplete
              options={users}
              getOptionLabel={(option) =>
                `${option.full_name || option.email} (${option.email})`
              }
              value={selectedUser || null}
              onChange={(_, newUser) => {
                setSelectedUserId(newUser?.id || '')
              }}
              disabled={!!preselectedUserId || usersQuery.isLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select User"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {usersQuery.isLoading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            {/* Balance Field Selection */}
            <FormControl fullWidth required>
              <InputLabel>Balance Field</InputLabel>
              <Select
                value={balanceField}
                label="Balance Field"
                onChange={(e) => setBalanceField(e.target.value as BalanceField)}
              >
                <MenuItem value="wallet">Main Wallet Balance</MenuItem>
                <MenuItem value="copy_wallet">Copy Trading Wallet Balance</MenuItem>
                <MenuItem value="long_term_wallet">Long-Term Wallet Balance</MenuItem>
                <MenuItem value="total">Total Balance (overrides all)</MenuItem>
              </Select>
            </FormControl>

            {/* Current Value Display */}
            {selectedUser && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Current Value
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {formatCurrency(currentValue)}
                </Typography>
              </Box>
            )}

            {/* New Value Input */}
            <TextField
              type="number"
              label="New Balance Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              fullWidth
              required
              helperText="Accepts any number: positive, negative, decimals, large values"
              inputProps={{
                step: '0.01',
              }}
            />

            {/* Delta Preview - Enhanced with Before/After/Delta */}
            {selectedUser && newValue && Number.isFinite(newValueNum) && (
              <Box
                sx={{
                  p: { xs: 1.5, sm: 2.5 }, // T2 density
                  bgcolor: delta === 0 ? 'action.hover' : delta >= 0 ? 'success.lighter' : 'error.lighter',
                  borderRadius: 3, // C1 geometry (12px)
                  border: '1px solid',
                  borderColor: delta === 0 ? 'divider' : delta >= 0 ? 'success.main' : 'error.main',
                  boxShadow: 1, // L3 surfaces
                }}
              >
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ opacity: 0.65 }}>
                      Before:
                    </Typography>
                    <Typography variant="h6" fontWeight={500}>
                      {formatCurrency(currentValue)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ opacity: 0.65 }}>
                      After:
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {formatCurrency(newValueNum)}
                    </Typography>
                  </Box>

                  <Box 
                    sx={{ 
                      pt: 1.5, 
                      mt: 1.5, 
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ opacity: 0.65 }}>
                      Δ:
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color={delta === 0 ? 'text.secondary' : delta >= 0 ? 'success.dark' : 'error.dark'}
                    >
                      {formatDelta(delta)}
                    </Typography>
                  </Box>

                  {balanceField !== 'total' && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ display: 'block', pt: 1, opacity: 0.65 }}
                    >
                      New Total Balance: {formatCurrency(newTotal)}
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

            {/* Reason Input */}
            <TextField
              label="Reason for Override"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              rows={3}
              fullWidth
              required
              helperText="Required for audit trail"
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isSubmitting}
              sx={{ mt: 2 }}
            >
              {isSubmitting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Processing...
                </>
              ) : (
                'Apply Balance Override'
              )}
            </Button>

            {/* Warning */}
            <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
              <Typography variant="caption">
                <strong>Warning:</strong> This action immediately modifies user balances and
                creates an immutable ledger entry. Use with caution.
              </Typography>
            </Alert>
          </Stack>
        </Box>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !overrideMutation.isPending && setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3, // C1 geometry
          },
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Confirm Balance Override
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body1">
              Set <strong>{selectedUser?.full_name || selectedUser?.email}</strong>'s{' '}
              <strong>{balanceField.replace('_', ' ')}</strong> balance from{' '}
              <strong>{formatCurrency(currentValue)}</strong> to{' '}
              <strong>{formatCurrency(parseFloat(newValue) || 0)}</strong>?
            </Typography>
            
            <Box
              sx={{
                p: 2,
                bgcolor: delta >= 0 ? 'success.lighter' : 'error.lighter',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: delta >= 0 ? 'success.main' : 'error.main',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Change Amount
              </Typography>
              <Typography
                variant="h6"
                fontWeight={600}
                color={delta >= 0 ? 'success.dark' : 'error.dark'}
              >
                {formatDelta(delta)}
              </Typography>
            </Box>

            <Alert severity="error" sx={{ borderRadius: 1.5 }}>
              <Typography variant="body2">
                <strong>This action cannot be undone.</strong> A ledger entry will be created for
                audit purposes.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            disabled={overrideMutation.isPending}
            variant="outlined"
            sx={{ px: 3 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmOverride}
            disabled={overrideMutation.isPending}
            variant="contained"
            color="error"
            sx={{ px: 3 }}
          >
            {overrideMutation.isPending ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Applying...
              </>
            ) : (
              'Confirm Override'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
