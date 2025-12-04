/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { AdminActionType } from "../models/AdminActionType";
import type { AdminBalanceAdjustmentsPublic } from "../models/AdminBalanceAdjustmentsPublic";
import type { BalanceOverrideRequest } from "../models/BalanceOverrideRequest";
import type { BalanceOverrideResponse } from "../models/BalanceOverrideResponse";
import type { CreateAdjustmentRequest } from "../models/CreateAdjustmentRequest";
import type { CreateAdjustmentResponse } from "../models/CreateAdjustmentResponse";
import type { LedgerEntriesPublic } from "../models/LedgerEntriesPublic";
import type { LedgerEntryPublic } from "../models/LedgerEntryPublic";
import type { LedgerStatus } from "../models/LedgerStatus";
import type { LedgerType } from "../models/LedgerType";

export class AdminLedgerService {
    /**
     * Create Balance Adjustment
     * Create an admin balance adjustment with full audit trail.
     *
     * This endpoint:
     * 1. Validates admin permission
     * 2. Loads current user balance
     * 3. Creates a ledger entry
     * 4. Creates an adjustment record
     * 5. Updates user balance atomically
     *
     * Requires admin role.
     * @param requestBody
     * @returns CreateAdjustmentResponse Successful Response
     * @throws ApiError
     */
    public static adminLedgerCreateBalanceAdjustment(requestBody: CreateAdjustmentRequest): CancelablePromise<CreateAdjustmentResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/ledger/adjustments",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Balance Adjustments
     * List admin balance adjustments with filters.
     *
     * Filters:
     * - user_id: Filter by affected user
     * - admin_id: Filter by admin who made adjustment
     * - action_type: Filter by type of adjustment
     * - start_date: Filter by created_at >= start_date
     * - end_date: Filter by created_at <= end_date
     *
     * Requires admin role.
     * @param skip
     * @param limit
     * @param userId
     * @param adminId
     * @param actionType
     * @param startDate
     * @param endDate
     * @returns AdminBalanceAdjustmentsPublic Successful Response
     * @throws ApiError
     */
    public static adminLedgerListBalanceAdjustments(
        skip?: number,
        limit: number = 100,
        userId?: string | null,
        adminId?: string | null,
        actionType?: AdminActionType | null,
        startDate?: string | null,
        endDate?: string | null,
    ): CancelablePromise<AdminBalanceAdjustmentsPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/ledger/adjustments",
            query: {
                skip: skip,
                limit: limit,
                user_id: userId,
                admin_id: adminId,
                action_type: actionType,
                start_date: startDate,
                end_date: endDate,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Ledger Entries
     * List ledger entries with filters.
     *
     * Filters:
     * - user_id: Filter by user
     * - ledger_type: Filter by entry type
     * - status: Filter by status
     * - asset: Filter by asset (BTC, ETH, USDT, USDC, or null for fiat)
     * - start_date: Filter by created_at >= start_date
     * - end_date: Filter by created_at <= end_date
     *
     * Requires admin role.
     * @param skip
     * @param limit
     * @param userId
     * @param ledgerType
     * @param status
     * @param asset
     * @param startDate
     * @param endDate
     * @returns LedgerEntriesPublic Successful Response
     * @throws ApiError
     */
    public static adminLedgerListLedgerEntries(
        skip?: number,
        limit: number = 100,
        userId?: string | null,
        ledgerType?: LedgerType | null,
        status?: LedgerStatus | null,
        asset?: string | null,
        startDate?: string | null,
        endDate?: string | null,
    ): CancelablePromise<LedgerEntriesPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/ledger/entries",
            query: {
                skip: skip,
                limit: limit,
                user_id: userId,
                ledger_type: ledgerType,
                status: status,
                asset: asset,
                start_date: startDate,
                end_date: endDate,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Ledger Entry
     * Get a specific ledger entry by ID.
     *
     * Requires admin role.
     * @param entryId
     * @returns LedgerEntryPublic Successful Response
     * @throws ApiError
     */
    public static adminLedgerGetLedgerEntry(entryId: string): CancelablePromise<LedgerEntryPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/ledger/entries/{entry_id}",
            path: {
                entry_id: entryId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Override User Balance
     * Superuser endpoint to directly set any user balance field.
     *
     * No validation limits - accepts any number (positive, negative, decimal).
     * Creates immutable ledger entry and adjustment record.
     *
     * Supported balance_field values:
     * - 'wallet': Main wallet balance
     * - 'copy_wallet': Copy trading wallet balance
     * - 'long_term_wallet': Long-term wallet balance
     * - 'total': Total balance (sets wallet and zeros others)
     *
     * Requires admin role.
     * @param requestBody
     * @returns BalanceOverrideResponse Successful Response
     * @throws ApiError
     */
    public static adminLedgerOverrideUserBalance(requestBody: BalanceOverrideRequest): CancelablePromise<BalanceOverrideResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/ledger/balance/override",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
