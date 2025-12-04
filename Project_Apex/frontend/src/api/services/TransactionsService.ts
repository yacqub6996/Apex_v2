/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { Message } from "../models/Message";
import type { PendingSummary } from "../models/PendingSummary";
import type { ROISource } from "../models/ROISource";
import type { TransactionCreate } from "../models/TransactionCreate";
import type { TransactionPublic } from "../models/TransactionPublic";
import type { TransactionStatus } from "../models/TransactionStatus";
import type { TransactionType } from "../models/TransactionType";
import type { TransactionUpdate } from "../models/TransactionUpdate";
import type { TransactionsPublic } from "../models/TransactionsPublic";

export class TransactionsService {
    /**
     * Read Transactions
     * @param skip
     * @param limit
     * @param type Filter by transaction type
     * @param status Filter by status
     * @param source Filter by ROI source
     * @param startDate Filter by start date
     * @param endDate Filter by end date
     * @returns TransactionsPublic Successful Response
     * @throws ApiError
     */
    public static transactionsReadTransactions(
        skip?: number,
        limit: number = 100,
        type?: TransactionType | null,
        status?: TransactionStatus | null,
        source?: ROISource | null,
        startDate?: string | null,
        endDate?: string | null,
    ): CancelablePromise<TransactionsPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/transactions/",
            query: {
                skip: skip,
                limit: limit,
                type: type,
                status: status,
                source: source,
                start_date: startDate,
                end_date: endDate,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Transaction
     * @param requestBody
     * @returns TransactionPublic Successful Response
     * @throws ApiError
     */
    public static transactionsCreateTransaction(requestBody: TransactionCreate): CancelablePromise<TransactionPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/transactions/",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Pending Summary
     * Return user's pending withdrawal totals grouped by source.
     * @returns PendingSummary Successful Response
     * @throws ApiError
     */
    public static transactionsGetPendingSummary(): CancelablePromise<PendingSummary> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/transactions/pending-summary",
        });
    }
    /**
     * Read Transaction
     * @param id
     * @returns TransactionPublic Successful Response
     * @throws ApiError
     */
    public static transactionsReadTransaction(id: string): CancelablePromise<TransactionPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/transactions/{id}",
            path: {
                id: id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Transaction
     * @param id
     * @param requestBody
     * @returns TransactionPublic Successful Response
     * @throws ApiError
     */
    public static transactionsUpdateTransaction(id: string, requestBody: TransactionUpdate): CancelablePromise<TransactionPublic> {
        return __request(OpenAPI, {
            method: "PUT",
            url: "/api/v1/transactions/{id}",
            path: {
                id: id,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Transaction
     * @param id
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static transactionsDeleteTransaction(id: string): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/v1/transactions/{id}",
            path: {
                id: id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Status
     * @param id
     * @param status
     * @returns TransactionPublic Successful Response
     * @throws ApiError
     */
    public static transactionsUpdateStatus(id: string, status: TransactionStatus): CancelablePromise<TransactionPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/transactions/{id}/status",
            path: {
                id: id,
            },
            query: {
                status: status,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Cancel Pending Withdrawal
     * Allow a user to cancel their own pending withdrawal
     *
     * Requirements:
     * - Owner only
     * - Transaction type = WITHDRAWAL
     * - Status = PENDING
     * -> Set status to CANCELLED and record an execution event
     * @param id
     * @returns TransactionPublic Successful Response
     * @throws ApiError
     */
    public static transactionsCancelPendingWithdrawal(id: string): CancelablePromise<TransactionPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/transactions/{id}/cancel",
            path: {
                id: id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
