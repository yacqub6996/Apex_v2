/**
 * AdminBalanceAdjustment - Admin component for creating balance adjustments
 * Follows C1 geometry, T2 density, L3 surface model
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
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminLedgerService } from '@/services/admin-ledger-service'
import { UsersService } from '@/api/services/UsersService'
import { AdminActionType, type CreateAdjustmentRequest } from '@/types/ledger'
import { toast } from 'react-toastify'

interface AdminBalanceAdjustmentProps {
  preselectedUserId?: string
  onSuccess?: () => void
}

export const AdminBalanceAdjustment: React.FC<AdminBalanceAdjustmentProps> = ({
  preselectedUserId,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState<string>(preselectedUserId || '')
  const [actionType, setActionType] = useState<AdminActionType>(AdminActionType.ADD_FUNDS)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  // Fetch users for autocomplete
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => UsersService.usersReadUsers(0, 1000),
  })

  const users = usersQuery.data?.data ?? []
  const selectedUser = users.find((u) => u.id === selectedUserId)

  const adjustmentMutation = useMutation({
    mutationFn: (data: CreateAdjustmentRequest) => AdminLedgerService.createBalanceAdjustment(data),
    onSuccess: (response) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['admin-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })

      toast.success(response.message)
      
      // Reset form
      if (!preselectedUserId) {
        setSelectedUserId('')
      }
      setAmount('')
      setReason('')
      setLocalError(null)
      onSuccess?.()
    },
    onError: (error: any) => {
      const errorMsg = error?.body?.detail || error?.message || 'Failed to create adjustment'
      setLocalError(errorMsg)
      toast.error(errorMsg)
    },
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    // Validate form
    if (!selectedUserId) {
      setLocalError('Please select a user')
      return
    }

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue)) {
      setLocalError('Please enter a valid number')
      return
    }

    // Validation based on action type
    if (actionType === AdminActionType.MANUAL_CORRECTION) {
      if (amountValue === 0) {
        setLocalError('Amount cannot be zero for manual corrections')
        return
      }
    } else {
      if (amountValue <= 0) {
        setLocalError('Amount must be positive')
        return
      }
    }

    if (!reason.trim()) {
      setLocalError('Please provide a reason for this adjustment')
      return
    }

    // Submit
    adjustmentMutation.mutate({
      user_id: selectedUserId,
      action_type: actionType,
      amount: amountValue,
      reason: reason.trim(),
    })
  }

  // Calculate preview balance
  const currentBalance = selectedUser?.wallet_balance || 0
  let previewBalance = currentBalance

  if (amount && !isNaN(parseFloat(amount))) {
    const amountValue = parseFloat(amount)
    if (actionType === AdminActionType.MANUAL_CORRECTION) {
      previewBalance = Math.max(0, currentBalance + amountValue)
    } else if (actionType === AdminActionType.ADD_FUNDS) {
      previewBalance = currentBalance + amountValue
    } else {
      previewBalance = Math.max(0, currentBalance - amountValue)
    }
  }

  const isDebitAction = [
    AdminActionType.DEDUCT_FUNDS,
    AdminActionType.REVERSE_TRANSACTION,
    AdminActionType.FORCE_COMPLETE_WITHDRAWAL,
  ].includes(actionType)

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 3,
        borderRadius: '12px',
        bgcolor: 'background.paper',
        boxShadow: 1,
      }}
    >
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        Create Balance Adjustment
      </Typography>

      <Stack spacing={3}>
        {/* User Selection */}
        <Autocomplete
          options={users}
          getOptionLabel={(option) => `${option.full_name || option.email} (${option.email})`}
          value={selectedUser || null}
          onChange={(_, newValue) => {
            setSelectedUserId(newValue?.id || '')
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

        {/* Action Type Selection */}
        <FormControl fullWidth required>
          <InputLabel>Action Type</InputLabel>
          <Select
            value={actionType}
            label="Action Type"
            onChange={(e) => setActionType(e.target.value as AdminActionType)}
          >
            <MenuItem value={AdminActionType.ADD_FUNDS}>Add Funds</MenuItem>
            <MenuItem value={AdminActionType.DEDUCT_FUNDS}>Deduct Funds</MenuItem>
            <MenuItem value={AdminActionType.REVERSE_TRANSACTION}>Reverse Transaction</MenuItem>
            <MenuItem value={AdminActionType.FORCE_COMPLETE_WITHDRAWAL}>
              Force Complete Withdrawal
            </MenuItem>
            <MenuItem value={AdminActionType.MANUAL_CORRECTION}>Manual Correction</MenuItem>
          </Select>
        </FormControl>

        {/* Amount Input */}
        <TextField
          label={
            actionType === AdminActionType.MANUAL_CORRECTION
              ? 'Amount (positive to add, negative to deduct)'
              : 'Amount (USD)'
          }
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          inputProps={{
            step: '0.01',
            min: actionType === AdminActionType.MANUAL_CORRECTION ? undefined : '0.01',
          }}
          helperText={
            actionType === AdminActionType.MANUAL_CORRECTION
              ? 'Enter positive for credit, negative for debit'
              : isDebitAction
              ? 'This amount will be deducted from the user balance'
              : 'This amount will be added to the user balance'
          }
        />

        {/* Reason Textarea */}
        <TextField
          label="Reason"
          multiline
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="Provide a clear justification for this adjustment (required for audit trail)"
        />

        {/* Preview Card */}
        {selectedUser && amount && !isNaN(parseFloat(amount)) && (
          <Card sx={{ bgcolor: 'action.hover', boxShadow: 0 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Preview
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Current Balance
                  </Typography>
                  <Typography variant="h6">{formatCurrency(currentBalance)}</Typography>
                </Box>
                <Typography variant="h6" color="text.secondary">
                  →
                </Typography>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    New Balance
                  </Typography>
                  <Typography
                    variant="h6"
                    color={previewBalance > currentBalance ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(previewBalance)}
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Delta: {formatCurrency(previewBalance - currentBalance)}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {localError && (
          <Alert severity="error" onClose={() => setLocalError(null)}>
            {localError}
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={adjustmentMutation.isPending}
          startIcon={adjustmentMutation.isPending ? <CircularProgress size={20} /> : null}
          sx={{ borderRadius: '12px' }}
        >
          {adjustmentMutation.isPending ? 'Creating...' : 'Create Adjustment'}
        </Button>

        <Typography variant="caption" color="text.secondary">
          This action will immediately update the user's balance and create an immutable audit trail
          entry.
        </Typography>
      </Stack>
    </Box>
  )
}
