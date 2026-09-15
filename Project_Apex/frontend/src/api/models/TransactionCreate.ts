/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TransactionStatus } from "./TransactionStatus";
import type { TransactionType } from "./TransactionType";
import type { WithdrawalSource } from "./WithdrawalSource";

export type TransactionCreate = {
    amount: number;
    transaction_type?: TransactionType;
    status?: TransactionStatus;
    description?: string | null;
    long_term_investment_id?: string | null;
    user_id?: string | null;
    withdrawal_source?: WithdrawalSource | null;
};
