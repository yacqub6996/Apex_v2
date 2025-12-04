/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CopyStatus } from "./CopyStatus";
import type { LongTermPlanTier } from "./LongTermPlanTier";

export type LongTermInvestmentItem = {
    id: string;
    plan_id: string;
    plan_name: string;
    plan_tier: LongTermPlanTier;
    allocation: number;
    status: CopyStatus;
    started_at: string;
    investment_due_date?: string | null;
    pending_withdrawal_transaction_id?: string | null;
    pending_withdrawal_amount?: number | null;
    early_withdrawal_requested?: boolean;
    lock_duration_months?: number | null;
};
