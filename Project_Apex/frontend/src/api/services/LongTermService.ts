/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { IncreaseEquityRequest } from "../models/IncreaseEquityRequest";
import type { InvestmentWithdrawalRequest } from "../models/InvestmentWithdrawalRequest";
import type { LongTermInvestmentList } from "../models/LongTermInvestmentList";
import type { LongTermPlanList } from "../models/LongTermPlanList";
import type { SubscribeLongTermRequest } from "../models/SubscribeLongTermRequest";
import type { SubscribeLongTermResponse } from "../models/SubscribeLongTermResponse";
import type { UpgradePlanRequest } from "../models/UpgradePlanRequest";
import type { WalletTransferRequest } from "../models/WalletTransferRequest";
import type { app__api__routes__long_term__WithdrawalRequest } from "../models/app__api__routes__long_term__WithdrawalRequest";

export class LongTermService {
    /**
     * List Long Term Plans
     * Return the available long-term plans. Plans are auto-seeded if missing.
     * @returns LongTermPlanList Successful Response
     * @throws ApiError
     */
    public static longTermListLongTermPlans(): CancelablePromise<LongTermPlanList> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/long-term/plans",
        });
    }
    /**
     * List Public Long Term Plans
     * Return the available long-term plans without requiring authentication.
     * @returns LongTermPlanList Successful Response
     * @throws ApiError
     */
    public static longTermListPublicLongTermPlans(): CancelablePromise<LongTermPlanList> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/long-term/plans/public",
        });
    }
    /**
     * List Long Term Investments
     * Return the current user's long-term plan allocations.
     * @returns LongTermInvestmentList Successful Response
     * @throws ApiError
     */
    public static longTermListLongTermInvestments(): CancelablePromise<LongTermInvestmentList> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/long-term/investments",
        });
    }
    /**
     * Subscribe To Long Term Plan
     * Allocate funds from wallet into a managed long-term plan.
     * @param requestBody
     * @returns SubscribeLongTermResponse Successful Response
     * @throws ApiError
     */
    public static longTermSubscribeToLongTermPlan(requestBody: SubscribeLongTermRequest): CancelablePromise<SubscribeLongTermResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/long-term/investments",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Request Long Term Withdrawal
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static longTermRequestLongTermWithdrawal(requestBody: app__api__routes__long_term__WithdrawalRequest): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/long-term/request-withdrawal",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Transfer Long Term Wallet
     * Transfer funds from the main wallet into the long-term wallet.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static longTermTransferLongTermWallet(requestBody: WalletTransferRequest): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/long-term/wallet/transfer",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Request Withdrawal From Active Investment
     * Create a pending withdrawal request for an active long-term allocation.
     * @param investmentId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static longTermRequestWithdrawalFromActiveInvestment(
        investmentId: string,
        requestBody: InvestmentWithdrawalRequest,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/long-term/investments/{investment_id}/request-withdrawal",
            path: {
                investment_id: investmentId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Increase Equity
     * @param requestBody
     * @returns SubscribeLongTermResponse Successful Response
     * @throws ApiError
     */
    public static longTermIncreaseEquity(requestBody: IncreaseEquityRequest): CancelablePromise<SubscribeLongTermResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/long-term/investments/increase-equity",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upgrade Plan
     * Deprecated endpoint retained for backward compatibility.
     * @param requestBody
     * @returns SubscribeLongTermResponse Successful Response
     * @throws ApiError
     */
    public static longTermUpgradePlan(requestBody: UpgradePlanRequest): CancelablePromise<SubscribeLongTermResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/long-term/investments/upgrade-plan",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
