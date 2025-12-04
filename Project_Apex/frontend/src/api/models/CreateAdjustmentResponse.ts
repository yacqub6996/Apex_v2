/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response after creating balance adjustment
 */
export type CreateAdjustmentResponse = {
    adjustment_id: string;
    ledger_entry_id: string;
    user_email: string;
    previous_balance: number;
    new_balance: number;
    delta: number;
    message: string;
};
