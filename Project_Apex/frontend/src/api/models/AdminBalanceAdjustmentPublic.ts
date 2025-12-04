/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminActionType } from "./AdminActionType";

/**
 * Public schema for admin balance adjustment
 */
export type AdminBalanceAdjustmentPublic = {
    admin_id: string;
    user_id: string;
    action_type: AdminActionType;
    previous_balance: number;
    new_balance: number;
    delta: number;
    reason: string;
    related_ledger_entry_id?: string | null;
    metadata_payload?: Record<string, any> | null;
    id: string;
    created_at: string;
};
