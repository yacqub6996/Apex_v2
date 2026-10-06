/**
 * Crypto deposit and withdrawal service
 * React Query hooks and utility functions for crypto operations
 */

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { CryptoService } from '@/api/services/CryptoService'
import { useAuth } from '@/providers/auth-provider'
import type {
  NetworkInfo,
  AvailableCoinPublic,
  GenerateAddressRequest,
  GenerateAddressResponse,
  ConfirmPaymentRequest,
  TransactionPublic,
} from '@/api'
import type { CryptoRates } from '@/types/crypto'

// Query keys
export const cryptoKeys = {
  all: ['crypto'] as const,
  availableCoins: () => [...cryptoKeys.all, 'available-coins'] as const,
  networks: () => [...cryptoKeys.all, 'networks'] as const,
  rates: () => [...cryptoKeys.all, 'rates'] as const,
  pendingDeposits: (userId?: string) =>
    [...cryptoKeys.all, 'pending-deposits', ...(userId ? [userId] : [])] as const,
}

/**
 * Get all available active coins and networks
 */
export function useAvailableCoins(): UseQueryResult<AvailableCoinPublic[], Error> {
  return useQuery({
    queryKey: cryptoKeys.availableCoins(),
    queryFn: () => CryptoService.cryptoGetAvailableCoins(),
    staleTime: 60 * 1000, // 1 minute
  })
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
export function usePendingDeposits(options?: {
  enabled?: boolean
}): UseQueryResult<TransactionPublic[], Error> {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: cryptoKeys.pendingDeposits(userId),
    queryFn: () => CryptoService.cryptoGetPendingDeposits(),
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(userId),
    staleTime: 0,
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
    refetchIntervalInBackground: true, // Reconcile even if tab was backgrounded while admin approved
    refetchOnWindowFocus: true, // Immediate reconcile when returning to tab
    refetchOnMount: 'always', // Fresh check whenever component mounts
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
      // Invalidate pending deposits, transactions, user balances, and copy trading settlement state
      queryClient.invalidateQueries({ queryKey: cryptoKeys.pendingDeposits() })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      queryClient.invalidateQueries({ queryKey: ['users-me'] })
      queryClient.invalidateQueries({ queryKey: ['copy-trading-summary'] })
      queryClient.invalidateQueries({ queryKey: ['copied-traders'] })
      queryClient.invalidateQueries({ queryKey: ['pending-summary'] })
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

  const netUpper = network.toUpperCase()

  // Basic format validation by network
  if (netUpper === 'BITCOIN' || netUpper === 'BTC') {
    if (trimmed.startsWith('bc1')) {
      if (!/^bc1[ac-hj-np-z02-9]{25,90}$/.test(trimmed)) {
        return { valid: false, error: 'Invalid Bitcoin SegWit (bc1) address format' }
      }
    } else if (trimmed.startsWith('1') || trimmed.startsWith('3')) {
      if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed)) {
        return { valid: false, error: 'Invalid Bitcoin address format' }
      }
    } else {
      return { valid: false, error: 'Invalid Bitcoin address: must start with bc1, 1, or 3' }
    }
  } else if (
    netUpper === 'ETHEREUM_ERC20' ||
    netUpper === 'POLYGON' ||
    netUpper === 'BSC_BEP20' ||
    netUpper === 'ARBITRUM' ||
    netUpper === 'AVAX_C' ||
    netUpper === 'OPTIMISM' ||
    netUpper === 'BASE' ||
    netUpper.includes('ERC20') ||
    netUpper.includes('BEP20') ||
    netUpper.includes('EVM')
  ) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      return { valid: false, error: 'Invalid EVM address format: must start with 0x followed by 40 hex characters' }
    }
  } else if (netUpper === 'TRON_TRC20' || netUpper === 'TRON' || netUpper === 'TRC20') {
    if (!trimmed.startsWith('T') || !/^T[a-zA-HJ-NP-Z0-9]{33}$/.test(trimmed)) {
      return { valid: false, error: 'Invalid TRON TRC20 address format: must start with T and be 34 characters' }
    }
  } else if (netUpper === 'SOLANA' || netUpper === 'SOL') {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
      return { valid: false, error: 'Invalid Solana address format: must be 32-44 base58 characters' }
    }
  } else if (netUpper === 'RIPPLE' || netUpper === 'XRP') {
    if (!trimmed.startsWith('r') || !/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(trimmed)) {
      return { valid: false, error: 'Invalid Ripple (XRP) address format: must start with r and be 25-35 characters' }
    }
  } else if (netUpper === 'LITECOIN' || netUpper === 'LTC') {
    if (
      !(
        (trimmed.startsWith('L') || trimmed.startsWith('M')) && /^[LM][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed)
      ) &&
      !(trimmed.startsWith('ltc1') && /^ltc1[ac-hj-np-z02-9]{25,90}$/.test(trimmed))
    ) {
      return { valid: false, error: 'Invalid Litecoin address format' }
    }
  } else if (netUpper === 'DOGECOIN' || netUpper === 'DOGE') {
    if (!trimmed.startsWith('D') || !/^D[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed)) {
      return { valid: false, error: 'Invalid Dogecoin address format: must start with D and be 34 characters' }
    }
  } else if (netUpper === 'TON' || netUpper === 'TONCOIN') {
    if (trimmed.length < 24 || trimmed.length > 66) {
      return { valid: false, error: 'Invalid TON address format' }
    }
  } else {
    // Custom / generic network validation
    if (trimmed.length < 10) {
      return { valid: false, error: 'Address is too short' }
    }
  }

  return { valid: true }
}

