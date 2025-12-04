import type { SubscribeLongTermResponse } from '@/api/models/SubscribeLongTermResponse';
import type { WalletTransferRequest } from '@/api/models/WalletTransferRequest';
import { OpenAPI } from '@/api/core/OpenAPI';
import { request as __request } from '@/api/core/request';

export interface IncreaseEquityPayload {
    user_investment_id: string;
    amount: number;
}

export async function increaseLongTermEquity(
    payload: IncreaseEquityPayload,
): Promise<SubscribeLongTermResponse> {
    return __request(OpenAPI, {
        method: 'POST',
        url: '/api/v1/long-term/investments/increase-equity',
        body: payload,
        mediaType: 'application/json',
        errors: {
            400: 'Invalid amount or insufficient balance',
            403: 'KYC approval required',
            404: 'Investment not found',
            422: 'Validation Error',
        },
    });
}


export interface ActiveInvestmentWithdrawalPayload {
    investmentId: string;
    amount?: number;
    note?: string;
    acknowledgePolicy: boolean;
}

export interface ActiveInvestmentWithdrawalResponse {
    transaction_id: string;
    status: string;
    amount: number;
    early_withdrawal: boolean;
    review_eta_hours: number;
}

export async function requestActiveInvestmentWithdrawal(
    payload: ActiveInvestmentWithdrawalPayload,
): Promise<ActiveInvestmentWithdrawalResponse> {
    return __request(OpenAPI, {
        method: 'POST',
        url: `/api/v1/long-term/investments/${payload.investmentId}/request-withdrawal`,
        body: {
            amount: payload.amount,
            note: payload.note,
            acknowledge_policy: payload.acknowledgePolicy,
        },
        mediaType: 'application/json',
        errors: {
            400: 'Withdrawal request invalid',
            403: 'KYC approval required',
            404: 'Investment not found',
            422: 'Validation Error',
        },
    });
}

export interface LongTermWalletWithdrawalRequest {
    amount: number;
    description?: string;
}

export interface LongTermWalletWithdrawalResponse {
    transaction_id: string;
    status: string;
}

export async function requestLongTermWalletWithdrawal(
    payload: LongTermWalletWithdrawalRequest,
): Promise<LongTermWalletWithdrawalResponse> {
    return __request(OpenAPI, {
        method: 'POST',
        url: '/api/v1/long-term/request-withdrawal',
        body: payload,
        mediaType: 'application/json',
        errors: {
            400: 'Withdrawal request invalid',
            403: 'KYC approval required',
            404: 'User not found',
            422: 'Validation Error',
        },
    });
}

export async function transferToLongTermWallet(
    payload: WalletTransferRequest,
): Promise<Record<string, any>> {
    return __request(OpenAPI, {
        method: 'POST',
        url: '/api/v1/long-term/wallet/transfer',
        body: payload,
        mediaType: 'application/json',
        errors: {
            400: 'Transfer request invalid',
            403: 'KYC approval required',
            404: 'User not found',
            422: 'Validation Error',
        },
    });
}
