/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LedgerStatus } from "./LedgerStatus";
import type { LedgerType } from "./LedgerType";

/**
 * Public schema for ledger entry
 */
export type LedgerEntryPublic = {
    /**
     * ID of the user affected by this ledger entry
     */
    user_id: string;
    /**
     * Type of ledger event (DEPOSIT, WITHDRAWAL, ADJUSTMENT, etc.)
     */
    ledger_type: LedgerType;
    /**
     * Human-readable transaction reference (e.g., TXN-123, blockchain hash)
     */
    tx_reference: string;
    /**
     * Asset code (BTC, ETH, USDT, USDC) for crypto, or None for fiat (USD)
     */
    asset?: string | null;
    /**
     * Blockchain network (BITCOIN, ETHEREUM_ERC20, TRON_TRC20) when applicable, None for fiat
     */
    network?: string | null;
    /**
     * Monetary impact in USD. Positive for credits (deposits, gains), negative for debits (withdrawals, fees)
     */
    amount_usd: number;
    /**
     * Crypto asset amount as string for precision. None for fiat-only transactions
     */
    crypto_amount?: string | null;
    /**
     * Human-readable summary for audit trail and user display
     */
    description: string;
    /**
     * Entry status: PENDING, APPROVED, REJECTED, or COMPLETED
     */
    status?: LedgerStatus;
    /**
     * Admin user ID if entry was admin-initiated. None for user or system-initiated
     */
    created_by_admin_id?: string | null;
    /**
     * Timestamp when entry was approved. None if not yet approved or not required
     */
    approved_at?: string | null;
    /**
     * Extended JSON data: blockchain tx hashes, KYC refs, fee details, etc. Schema varies by ledger_type
     */
    metadata_payload?: Record<string, any> | null;
    id: string;
    created_at: string;
};
