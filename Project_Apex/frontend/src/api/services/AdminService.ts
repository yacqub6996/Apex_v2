/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { AdminDashboardSummary } from "../models/AdminDashboardSummary";
import type { ApproveCryptoDepositRequest } from "../models/ApproveCryptoDepositRequest";
import type { ApproveCryptoDepositResponse } from "../models/ApproveCryptoDepositResponse";
import type { ManualProfitRequest } from "../models/ManualProfitRequest";
import type { ManualProfitResponse } from "../models/ManualProfitResponse";
import type { SimulationTriggerRequest } from "../models/SimulationTriggerRequest";
import type { SimulationTriggerResponse } from "../models/SimulationTriggerResponse";

export class AdminService {
    /**
     * Get Admin Dashboard Summary
     * @returns AdminDashboardSummary Successful Response
     * @throws ApiError
     */
    public static adminGetAdminDashboardSummary(): CancelablePromise<AdminDashboardSummary> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/dashboard",
        });
    }
    /**
     * Trigger Simulated Trades
     * @param requestBody
     * @returns SimulationTriggerResponse Successful Response
     * @throws ApiError
     */
    public static adminTriggerSimulatedTrades(requestBody: SimulationTriggerRequest): CancelablePromise<SimulationTriggerResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/simulations/run",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Grant Manual Profit Event
     * @param userId
     * @param requestBody
     * @returns ManualProfitResponse Successful Response
     * @throws ApiError
     */
    public static adminGrantManualProfitEvent(userId: string, requestBody: ManualProfitRequest): CancelablePromise<ManualProfitResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/simulations/users/{user_id}/profit",
            path: {
                user_id: userId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Approve Crypto Deposit
     * Admin approves a crypto deposit after verifying on-chain
     * @param requestBody
     * @returns ApproveCryptoDepositResponse Successful Response
     * @throws ApiError
     */
    public static adminApproveCryptoDeposit(requestBody: ApproveCryptoDepositRequest): CancelablePromise<ApproveCryptoDepositResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/crypto-deposits/approve",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reject Crypto Deposit
     * Admin rejects a crypto deposit
     * @param transactionId
     * @param reason
     * @returns any Successful Response
     * @throws ApiError
     */
    public static adminRejectCryptoDeposit(transactionId: string, reason?: string | null): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/crypto-deposits/{transaction_id}/reject",
            path: {
                transaction_id: transactionId,
            },
            query: {
                reason: reason,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
