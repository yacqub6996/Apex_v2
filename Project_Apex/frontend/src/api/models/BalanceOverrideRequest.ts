/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request to directly set a user's balance (superuser only)
 */
export type BalanceOverrideRequest = {
    user_id: string;
    balance_field: string;
    new_value: number;
    reason: string;
};
