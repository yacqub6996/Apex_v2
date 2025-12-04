/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { PendingWithdrawalsList } from "../models/PendingWithdrawalsList";
import type { SimulationScenarioRequest } from "../models/SimulationScenarioRequest";
import type { SimulationScenarioResponse } from "../models/SimulationScenarioResponse";
import type { WithdrawalResponse } from "../models/WithdrawalResponse";
import type { app__api__routes__admin_simulations__WithdrawalRequest } from "../models/app__api__routes__admin_simulations__WithdrawalRequest";

export class AdminSimulationsService {
    /**
     * Run Simulation Scenario
     * Run a controlled simulation scenario with specific trader categories and profit scenarios.
     * @param requestBody
     * @returns SimulationScenarioResponse Successful Response
     * @throws ApiError
     */
    public static adminSimulationsRunSimulationScenario(requestBody: SimulationScenarioRequest): CancelablePromise<SimulationScenarioResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/simulations/scenario",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Request Withdrawal
     * Request a withdrawal from copy trading balance to main balance.
     * Uses current copy_trading_balance field which includes ROI gains.
     * @param requestBody
     * @returns WithdrawalResponse Successful Response
     * @throws ApiError
     */
    public static adminSimulationsRequestWithdrawal(
        requestBody: app__api__routes__admin_simulations__WithdrawalRequest,
    ): CancelablePromise<WithdrawalResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/simulations/withdrawals/request",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Pending Withdrawals
     * Get pending withdrawal requests for admin approval.
     * @param skip
     * @param limit
     * @returns PendingWithdrawalsList Successful Response
     * @throws ApiError
     */
    public static adminSimulationsGetPendingWithdrawals(skip?: number, limit: number = 50): CancelablePromise<PendingWithdrawalsList> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/simulations/withdrawals/pending",
            query: {
                skip: skip,
                limit: limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Approve Withdrawal
     * Approve a pending withdrawal request.
     * Uses copy_trading_balance field which includes ROI gains.
     * @param transactionId
     * @returns WithdrawalResponse Successful Response
     * @throws ApiError
     */
    public static adminSimulationsApproveWithdrawal(transactionId: string): CancelablePromise<WithdrawalResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/simulations/withdrawals/{transaction_id}/approve",
            path: {
                transaction_id: transactionId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reject Withdrawal
     * Reject a pending withdrawal request.
     * @param transactionId
     * @param reason
     * @returns WithdrawalResponse Successful Response
     * @throws ApiError
     */
    public static adminSimulationsRejectWithdrawal(transactionId: string, reason: string = "Withdrawal rejected"): CancelablePromise<WithdrawalResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/simulations/withdrawals/{transaction_id}/reject",
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
