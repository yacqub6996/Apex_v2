/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountTier } from "./AccountTier";
import type { KycStatus } from "./KycStatus";
import type { UserRole } from "./UserRole";

export type UserPublic = {
    email: string;
    is_active?: boolean;
    is_superuser?: boolean;
    full_name?: string | null;
    id: string;
    balance: number;
    wallet_balance: number;
    copy_trading_balance: number;
    long_term_balance: number;
    copy_trading_wallet_balance: number;
    long_term_wallet_balance: number;
    profile_picture_url?: string | null;
    is_locked: boolean;
    session_locked_until: string | null;
    role: UserRole;
    account_tier: AccountTier;
    kyc_status: KycStatus;
    kyc_submitted_at: string | null;
    kyc_approved_at: string | null;
    kyc_verified_at: string | null;
    kyc_rejected_reason: string | null;
    kyc_notes: string | null;
    email_verified?: boolean | null;
    email_verified_at?: string | null;
    last_login_at: string | null;
};
