/**
 * Crypto deposit and withdrawal service
 * React Query hooks and utility functions for crypto operations
 */

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { CryptoService } from '@/api/services/CryptoService'
import type { NetworkInfo, CryptoRates, GenerateAddressRequest, GenerateAddressResponse, ConfirmPaymentRequest, TransactionPublic } from '@/api'

// Query keys
export const cryptoKeys = {
  all: ['crypto'] as const,
  networks: () => [...cryptoKeys.all, 'networks'] as const,
  rates: () => [...cryptoKeys.all, 'rates'] as const,
  pendingDeposits: () => [...cryptoKeys.all, 'pending-deposits'] as const,
}

/**
 * Get available crypto networks
 */
export function useNetworks(): UseQueryResult<NetworkInfo[], Error> {
  return useQuery({
    queryKey: cryptoKeys.networks(),
    queryFn: () => CryptoService.cryptoGetAvailableNetworks(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get current crypto rates
 */
export function useCryptoRates(): UseQueryResult<CryptoRates, Error> {
  return useQuery({
    queryKey: cryptoKeys.rates(),
    queryFn: () => CryptoService.cryptoGetCryptoRates(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

/**
 * Get pending deposits for current user
 */
export function usePendingDeposits(): UseQueryResult<TransactionPublic[], Error> {
  return useQuery({
    queryKey: cryptoKeys.pendingDeposits(),
    queryFn: () => CryptoService.cryptoGetPendingDeposits(),
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
  })
}

/**
 * Generate deposit address
 */
export function useGenerateAddress(): UseMutationResult<GenerateAddressResponse, Error, GenerateAddressRequest> {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (request: GenerateAddressRequest) => 
      CryptoService.cryptoGenerateDepositAddress(request),
    onSuccess: () => {
      // Invalidate pending deposits to show the new one
      queryClient.invalidateQueries({ queryKey: cryptoKeys.pendingDeposits() })
    },
  })
}

/**
 * Confirm payment sent
 */
export function useConfirmPayment(): UseMutationResult<TransactionPublic, Error, ConfirmPaymentRequest> {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (request: ConfirmPaymentRequest) => 
      CryptoService.cryptoConfirmPaymentSent(request),
    onSuccess: () => {
      // Invalidate pending deposits and transactions
      queryClient.invalidateQueries({ queryKey: cryptoKeys.pendingDeposits() })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      queryClient.invalidateQueries({ queryKey: ['users-me'] })
    },
  })
}

/**
 * Calculate crypto amount from USD
 */
export function calculateCryptoAmount(
  usdAmount: number,
  rate: number,
  decimals: number = 8
): string {
  if (!rate || rate === 0) return '0'
  const cryptoAmount = usdAmount / rate
  // Remove trailing zeros but preserve at least one digit after decimal if present
  const fixed = cryptoAmount.toFixed(decimals)
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

/**
 * Calculate USD amount from crypto
 */
export function calculateUsdAmount(
  cryptoAmount: number,
  rate: number
): number {
  if (!rate || rate === 0) return 0
  return cryptoAmount * rate
}

/**
 * Format crypto amount with proper decimals
 */
export function formatCryptoAmount(amount: string | number, symbol: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return '0'
  
  // Different decimals for different coins
  const decimals = symbol === 'BTC' ? 8 : symbol === 'ETH' ? 6 : 2
  return `${numAmount.toFixed(decimals).replace(/\.?0+$/, '')} ${symbol}`
}

/**
 * Format USD amount
 */
export function formatUsdAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Detect network from address format
 * Returns detected network or null if ambiguous/unknown
 */
export function detectNetworkFromAddress(address: string, asset: string): string | null {
  if (!address || address.trim() === '') {
    return null
  }

  const trimmed = address.trim()

  // Bitcoin detection
  if (asset === 'BTC') {
    // Bech32 addresses are lowercase only by standard
    if (trimmed.startsWith('bc1') && /^bc1[ac-hj-np-z02-9]{39,59}$/.test(trimmed)) {
      return 'BITCOIN'
    }
    if ((trimmed.startsWith('1') || trimmed.startsWith('3')) && /^[13][a-zA-HJ-NP-Z0-9]{25,34}$/.test(trimmed)) {
      return 'BITCOIN'
    }
  }

  // Ethereum-style addresses (ERC20, Polygon)
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    // Ambiguous for USDT/USDC (could be Ethereum or Polygon)
    // Default to Ethereum but allow manual override
    if (asset === 'ETH') {
      return 'ETHEREUM_ERC20'
    }
    if (asset === 'USDT' || asset === 'USDC') {
      // Return null to indicate manual selection needed
      return null
    }
  }

  // TRON detection
  if (trimmed.startsWith('T') && /^T[a-zA-HJ-NP-Z0-9]{33}$/.test(trimmed)) {
    if (asset === 'USDT') {
      return 'TRON_TRC20'
    }
  }

  return null
}

/**
 * Validate crypto address format (basic validation)
 */
export function validateAddress(address: string, network: string): { valid: boolean; error?: string } {
  if (!address || address.trim() === '') {
    return { valid: false, error: 'Address is required' }
  }

  const trimmed = address.trim()

  // Basic format validation by network
  switch (network) {
    case 'BITCOIN':
      // Bitcoin addresses: Legacy (1...) 26-35 chars, P2SH (3...) 26-35 chars, SegWit (bc1...) 42-62 chars
      if (trimmed.startsWith('bc1')) {
        // Bech32 addresses are lowercase only by standard
        if (!/^bc1[ac-hj-np-z02-9]{39,59}$/.test(trimmed)) {
          return { valid: false, error: 'Invalid Bitcoin SegWit address format' }
        }
      } else if (trimmed.startsWith('1')) {
        if (!/^1[a-zA-HJ-NP-Z0-9]{25,34}$/.test(trimmed)) {
          return { valid: false, error: 'Invalid Bitcoin legacy address format' }
        }
      } else if (trimmed.startsWith('3')) {
        if (!/^3[a-zA-HJ-NP-Z0-9]{25,34}$/.test(trimmed)) {
          return { valid: false, error: 'Invalid Bitcoin P2SH address format' }
        }
      } else {
        return { valid: false, error: 'Invalid Bitcoin address format' }
      }
      break
    
    case 'ETHEREUM_ERC20':
    case 'POLYGON':
      // Ethereum addresses start with 0x and are 42 characters
      if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
        return { valid: false, error: 'Invalid Ethereum address format' }
      }
      break
    
    case 'TRON_TRC20':
      // TRON addresses start with T and are 34 characters
      if (!/^T[a-zA-HJ-NP-Z0-9]{33}$/.test(trimmed)) {
        return { valid: false, error: 'Invalid TRON address format' }
      }
      break
    
    default:
      // Generic validation - at least 20 characters
      if (trimmed.length < 20) {
        return { valid: false, error: 'Address is too short' }
      }
  }

  return { valid: true }
}
