/**
 * Crypto deposit and withdrawal types
 * Complements the generated API types with additional frontend-specific types
 */

// Re-export generated types for convenience
export type {
  NetworkInfo,
  CryptoRates,
  GenerateAddressRequest,
  GenerateAddressResponse,
  ConfirmPaymentRequest,
} from '@/api'

// Asset types
export type Asset = 'BTC' | 'ETH' | 'USDT' | 'USDC'

// Network types per asset
export type NetworkKey = 'BITCOIN' | 'ETHEREUM_ERC20' | 'TRON_TRC20' | 'POLYGON'

// Deposit session state (extends GenerateAddressResponse with computed properties)
export interface DepositSession {
  id: string // transaction_id
  asset: Asset
  network: NetworkKey
  amountUsd: number
  vatFeeUsd: number
  cryptoAmount: string
  usdRate: number
  walletAddress: string
  qrCodeUrl?: string
  expiresAt: string // ISO timestamp
  timeRemaining: number // seconds
  expired: boolean
  createdAt?: string // ISO timestamp
  instructions?: string
  memo?: string | null
  meta?: {
    source?: string
    fallback_used?: boolean
  }
}

// Deposit status
export type DepositStatus = 'pending' | 'confirmed' | 'expired' | 'failed' | 'completed'

// Timer states
export type TimerState = 'active' | 'warning' | 'critical' | 'expired'

// Withdrawal request
export interface WithdrawalRequest {
  id?: string
  asset: Asset
  network: NetworkKey
  amountUsd: number
  cryptoAmount: string
  address: string
  memo?: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  createdAt?: string
}

// Copy state for UI feedback
export interface CopyState {
  copied: boolean
  animating: boolean
}

// Network configuration with fees and requirements
export interface NetworkConfig {
  key: NetworkKey
  label: string
  chainName: string
  feeEstimate: string
  confirmationTime: string
  requiresMemo: boolean
  memoLabel?: string // e.g., "Memo" for XRP, "Tag" for XLM
}

// Asset configuration
export interface AssetConfig {
  symbol: Asset
  name: string
  icon?: string
  supportedNetworks: NetworkKey[]
  requiresMemo: boolean
}
