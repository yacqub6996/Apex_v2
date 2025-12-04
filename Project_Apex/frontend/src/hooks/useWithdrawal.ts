/**
 * useWithdrawal - Hook for managing crypto withdrawal flow
 * Handles withdrawal request creation with address validation
 */

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCryptoRates, validateAddress } from '@/services/crypto'
import type { Asset, NetworkKey } from '@/types/crypto'
import { TransactionsService } from '@/api/services/TransactionsService'
import { TransactionType, TransactionStatus } from '@/api'

interface WithdrawalFormData {
  asset: Asset
  network: NetworkKey
  amountUsd: number
  address: string
  memo?: string
}

export type WalletType = 'main' | 'copy' | 'long-term'

interface UseWithdrawalFlowOptions {
  walletType?: WalletType
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * Main withdrawal flow hook
 * Manages withdrawal request creation and validation
 */
export function useWithdrawalFlow(options: UseWithdrawalFlowOptions = {}) {
  const { walletType = 'main', onSuccess, onError } = options
  const [step, setStep] = useState<'input' | 'review' | 'pending'>('input')
  const [formData, setFormData] = useState<WithdrawalFormData | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  
  const queryClient = useQueryClient()
  const { data: rates } = useCryptoRates()

  const withdrawalMutation = useMutation({
    mutationFn: async (data: WithdrawalFormData) => {
      // Calculate crypto amount based on current rate
      const rate = rates?.[data.asset] || 1
      const cryptoAmount = (data.amountUsd / rate).toFixed(8).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
      
      // Determine withdrawal source based on wallet type
      const withdrawalSource = walletType === 'copy' ? 'COPY_TRADING_WALLET' : 
                               walletType === 'long-term' ? 'LONG_TERM_WALLET' : 
                               'MAIN_WALLET'
      
      // Note: TransactionCreate schema doesn't currently support crypto-specific fields (crypto_network, crypto_address, etc.)
      // These need to be added to the backend TransactionCreate model for proper structured storage
      // For now, including all details in the description field for admin visibility
      const description = `Crypto withdrawal from ${withdrawalSource}: ${data.amountUsd} USD (${cryptoAmount} ${data.asset}) on ${data.network} to ${data.address}${data.memo ? ` | Memo: ${data.memo}` : ''}`
      
      return TransactionsService.transactionsCreateTransaction({
        amount: data.amountUsd,
        transaction_type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        description,
      })
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      queryClient.invalidateQueries({ queryKey: ['users-me'] })
      queryClient.invalidateQueries({ queryKey: ['copied-traders'] })
      queryClient.invalidateQueries({ queryKey: ['account-summary'] })
      
      setStep('pending')
      onSuccess?.()
    },
    onError: (error: Error) => {
      onError?.(error)
    },
  })

  const validateWithdrawalAddress = useCallback(
    (address: string, network: NetworkKey): boolean => {
      const validation = validateAddress(address, network)
      setAddressError(validation.error || null)
      return validation.valid
    },
    []
  )

  const handleSubmitForm = useCallback(
    (data: WithdrawalFormData) => {
      // Validate address
      if (!validateWithdrawalAddress(data.address, data.network)) {
        return false
      }

      setFormData(data)
      setStep('review')
      return true
    },
    [validateWithdrawalAddress]
  )

  const handleConfirmWithdrawal = useCallback(async () => {
    if (!formData) return

    await withdrawalMutation.mutateAsync(formData)
  }, [formData, withdrawalMutation])

  const handleBack = useCallback(() => {
    if (step === 'review') {
      setStep('input')
    }
  }, [step])

  const handleReset = useCallback(() => {
    setFormData(null)
    setStep('input')
    setAddressError(null)
  }, [])

  const calculateCryptoAmount = useCallback(
    (usdAmount: number, asset: Asset): string => {
      if (!rates || !rates[asset]) return '0'
      const rate = rates[asset]
      const cryptoAmount = usdAmount / rate
      const decimals = asset === 'BTC' ? 8 : asset === 'ETH' ? 6 : 2
      return cryptoAmount.toFixed(decimals).replace(/\.?0+$/, '')
    },
    [rates]
  )

  return {
    step,
    formData,
    addressError,
    rates,
    validateWithdrawalAddress,
    handleSubmitForm,
    handleConfirmWithdrawal,
    handleBack,
    handleReset,
    calculateCryptoAmount,
    isSubmitting: withdrawalMutation.isPending,
    submitError: withdrawalMutation.error,
  }
}

/**
 * Hook for network-specific memo requirements
 */
export function useMemoRequirement(network: NetworkKey | null): {
  requiresMemo: boolean
  memoLabel: string
} {
  // Networks that require memo/tag
  const memoNetworks: Record<string, string> = {
    // Future support for these networks
    // XRP: 'Destination Tag',
    // XLM: 'Memo',
    // EOS: 'Memo',
    // ATOM: 'Memo',
  }

  const requiresMemo = network ? network in memoNetworks : false
  const memoLabel = network && memoNetworks[network] ? memoNetworks[network] : 'Memo'

  return { requiresMemo, memoLabel }
}
