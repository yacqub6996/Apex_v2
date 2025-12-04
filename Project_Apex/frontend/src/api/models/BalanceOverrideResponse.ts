/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response after balance override
 */
export type BalanceOverrideResponse = {
    user_email: string;
    balance_field: string;
    previous_value: number;
    new_value: number;
    delta: number;
    ledger_entry_id: string;
    message: string;
};
