/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { CopiedTradersResponse } from "../models/CopiedTradersResponse";
import type { CopyTradingAggregateResponse } from "../models/CopyTradingAggregateResponse";
import type { CopyTradingHistoryResponse } from "../models/CopyTradingHistoryResponse";
import type { CopyTradingStartRequest } from "../models/CopyTradingStartRequest";
import type { CopyTradingStartResponse } from "../models/CopyTradingStartResponse";
import type { CopyTradingUpdateResponse } from "../models/CopyTradingUpdateResponse";
import type { CopyTradingWithdrawalRequest } from "../models/CopyTradingWithdrawalRequest";
import type { CopyTradingWithdrawalResponse } from "../models/CopyTradingWithdrawalResponse";
import type { ExecutionFeedResponse } from "../models/ExecutionFeedResponse";
import type { FundWalletRequest } from "../models/FundWalletRequest";
import type { FundWalletResponse } from "../models/FundWalletResponse";
import type { PartialReduceRequest } from "../models/PartialReduceRequest";
import type { TraderVerificationRequest } from "../models/TraderVerificationRequest";
import type { TraderVerificationResponse } from "../models/TraderVerificationResponse";
import type { CopyTradingSummaryResponse } from "../models/CopyTradingSummaryResponse";

export class CopyTradingService {
    /**
     * Verify Trader Code
     * Validate a trader code and return a summary if the trader exists and is public.
     * @param requestBody
     * @returns TraderVerificationResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingVerifyTraderCode(requestBody: TraderVerificationRequest): CancelablePromise<TraderVerificationResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/copy-trading/verify",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Copied Traders
     * Return traders that the current user is actively copying.
     * @param skip
     * @param limit
     * @returns CopiedTradersResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingListCopiedTraders(skip?: number, limit: number = 100): CancelablePromise<CopiedTradersResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/copy-trading/copied",
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
     * Request Copy Trading Withdrawal
     * @param requestBody
     * @returns CopyTradingWithdrawalResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingRequestCopyTradingWithdrawal(requestBody: CopyTradingWithdrawalRequest): CancelablePromise<CopyTradingWithdrawalResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/copy-trading/request-withdrawal",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Fund Wallet
     * @param requestBody
     * @returns FundWalletResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingFundWallet(requestBody: FundWalletRequest): CancelablePromise<FundWalletResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/copy-trading/fund-wallet",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Start Copy Trading
     * Create a copy-trading relationship between the current user and a trader.
     * @param requestBody
     * @returns CopyTradingStartResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingStartCopyTrading(requestBody: CopyTradingStartRequest): CancelablePromise<CopyTradingStartResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/copy-trading/start",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Pause Copy Relationship
     * Pause an active copy-trading relationship for the current user.
     * @param copyId
     * @returns CopyTradingUpdateResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingPauseCopyRelationship(copyId: string): CancelablePromise<CopyTradingUpdateResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/copy-trading/copied/{copy_id}/pause",
            path: {
                copy_id: copyId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Stop Copy Relationship
     * Stop a copy-trading relationship permanently for the current user.
     * @param copyId
     * @returns CopyTradingUpdateResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingStopCopyRelationship(copyId: string): CancelablePromise<CopyTradingUpdateResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/copy-trading/copied/{copy_id}/stop",
            path: {
                copy_id: copyId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reduce Copy Allocation
     * Partially reduce an active copy-trading allocation, returning funds to Copy Trading Wallet.
     *
     * Guardrails:
     * - Remaining allocation must be >= max($100, 10% of current allocation), unless reducing to zero (routes to Stop).
     * - Reduction amount must be whole dollars.
     * @param copyId
     * @param requestBody
     * @returns CopyTradingUpdateResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingReduceCopyAllocation(copyId: string, requestBody: PartialReduceRequest): CancelablePromise<CopyTradingUpdateResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/copy-trading/copied/{copy_id}/reduce",
            path: {
                copy_id: copyId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Resume Copy Relationship
     * Resume a previously paused copy-trading relationship.
     * @param copyId
     * @returns CopyTradingUpdateResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingResumeCopyRelationship(copyId: string): CancelablePromise<CopyTradingUpdateResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/copy-trading/copied/{copy_id}/resume",
            path: {
                copy_id: copyId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Execution Feed
     * @param limit
     * @param since
     * @returns ExecutionFeedResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingReadExecutionFeed(limit: number = 25, since?: string | null): CancelablePromise<ExecutionFeedResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/copy-trading/executions",
            query: {
                limit: limit,
                since: since,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Copy Trading Summary
     * Return aggregate copy-trading counts grouped by status (admin only).
     * @returns CopyTradingAggregateResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingCopyTradingSummary(): CancelablePromise<CopyTradingAggregateResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/copy-trading/summary",
        });
    }
    /**
     * User Copy Trading Summary
     * Return per-user copy-trading allocation and PnL summary.
     * @returns CopyTradingSummaryResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingGetCopyTradingSummary(): CancelablePromise<CopyTradingSummaryResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/copy-trading/user-summary",
        });
    }
    /**
     * Get Copy Trading History
     * Get copy trading history for the current user.
     * Includes FOLLOWER_PROFIT and TRADER_SIMULATION events (excludes MANUAL_ADJUSTMENT).
     * @param page
     * @param pageSize
     * @returns CopyTradingHistoryResponse Successful Response
     * @throws ApiError
     */
    public static copyTradingGetCopyTradingHistory(page: number = 1, pageSize: number = 20): CancelablePromise<CopyTradingHistoryResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/copy-trading/history",
            query: {
                page: page,
                page_size: pageSize,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
