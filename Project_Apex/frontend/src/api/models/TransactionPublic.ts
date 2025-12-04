/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ROISource } from "./ROISource";
import type { TransactionStatus } from "./TransactionStatus";
import type { TransactionType } from "./TransactionType";
import type { WithdrawalSource } from "./WithdrawalSource";

export type TransactionPublic = {
    amount: number;
    transaction_type?: TransactionType;
    status?: TransactionStatus;
    description?: string | null;
    long_term_investment_id?: string | null;
    id: string;
    user_id: string;
    created_at: string;
    executed_at: string | null;
    roi_percent?: number | null;
    symbol?: string | null;
    source?: ROISource | null;
    pushed_by_admin_id?: string | null;
    reversal_of?: string | null;
    withdrawal_source?: WithdrawalSource | null;
    crypto_network?: string | null;
    crypto_address?: string | null;
    crypto_coin?: string | null;
    crypto_amount?: string | null;
    crypto_memo?: string | null;
    payment_confirmed_by_user?: boolean;
    payment_confirmed_at?: string | null;
    address_expires_at?: string | null;
    vat_amount?: number | null;
};
