/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AdminDepositItem = {
    id: string;
    user_id: string;
    email: string;
    amount: number;
    status: string;
    transaction_type: string;
    created_at: string;
    crypto_network?: string | null;
    crypto_address?: string | null;
    crypto_coin?: string | null;
    crypto_amount?: string | null;
    payment_confirmed_by_user?: boolean;
    payment_confirmed_at?: string | null;
    address_expires_at?: string | null;
    vat_amount?: number | null;
};
