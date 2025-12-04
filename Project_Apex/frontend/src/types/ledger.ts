/**
 * Types for Financial Ledger and Admin Balance Adjustments
 * Manually created to match backend models until API client is regenerated
 */

export enum LedgerType {
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  COPY_TRANSFER_IN = "COPY_TRANSFER_IN",
  COPY_TRANSFER_OUT = "COPY_TRANSFER_OUT",
  LONG_TERM_TRANSFER_IN = "LONG_TERM_TRANSFER_IN",
  LONG_TERM_TRANSFER_OUT = "LONG_TERM_TRANSFER_OUT",
  ADJUSTMENT = "ADJUSTMENT",
  ROI_CREDIT = "ROI_CREDIT",
  FEE_DEBIT = "FEE_DEBIT",
}

export enum LedgerStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
}

export enum AdminActionType {
  ADD_FUNDS = "ADD_FUNDS",
  DEDUCT_FUNDS = "DEDUCT_FUNDS",
  REVERSE_TRANSACTION = "REVERSE_TRANSACTION",
  FORCE_COMPLETE_WITHDRAWAL = "FORCE_COMPLETE_WITHDRAWAL",
  MANUAL_CORRECTION = "MANUAL_CORRECTION",
}

export interface LedgerEntry {
  id: string
  user_id: string
  ledger_type: LedgerType
  tx_reference: string
  asset: string | null
  network: string | null
  amount_usd: number
  crypto_amount: string | null
  description: string
  status: LedgerStatus
  created_by_admin_id: string | null
  approved_at: string | null
  metadata: Record<string, any> | null
  created_at: string
}

export interface LedgerEntriesResponse {
  data: LedgerEntry[]
  count: number
}

export interface AdminBalanceAdjustment {
  id: string
  admin_id: string
  user_id: string
  action_type: AdminActionType
  previous_balance: number
  new_balance: number
  delta: number
  reason: string
  related_ledger_entry_id: string | null
  metadata: Record<string, any> | null
  created_at: string
}

export interface AdminBalanceAdjustmentsResponse {
  data: AdminBalanceAdjustment[]
  count: number
}

export interface CreateAdjustmentRequest {
  user_id: string
  action_type: AdminActionType
  amount: number
  reason: string
  metadata?: Record<string, any>
}

export interface CreateAdjustmentResponse {
  adjustment_id: string
  ledger_entry_id: string
  user_email: string
  previous_balance: number
  new_balance: number
  delta: number
  message: string
}

export type BalanceField = 'wallet' | 'copy_wallet' | 'long_term_wallet' | 'total'

export interface BalanceOverrideRequest {
  user_id: string
  balance_field: BalanceField
  new_value: number
  reason: string
}

export interface BalanceOverrideResponse {
  user_email: string
  balance_field: string
  previous_value: number
  new_value: number
  delta: number
  ledger_entry_id: string
  message: string
}
