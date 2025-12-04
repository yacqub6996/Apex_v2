/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TransactionStatus } from "./TransactionStatus";
import type { TransactionType } from "./TransactionType";

export type TransactionUpdate = {
    amount?: number | null;
    transaction_type?: TransactionType | null;
    status?: TransactionStatus | null;
    description?: string | null;
    long_term_investment_id?: string | null;
};
