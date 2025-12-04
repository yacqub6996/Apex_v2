/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { CopyTradingROIResponse } from "../models/CopyTradingROIResponse";
import type { HistoricalROIResponse } from "../models/HistoricalROIResponse";
import type { LongTermROIHistoryResponse } from "../models/LongTermROIHistoryResponse";
import type { MathematicalPlausibilityResponse } from "../models/MathematicalPlausibilityResponse";
import type { PerformanceBenchmarkResponse } from "../models/PerformanceBenchmarkResponse";
import type { PortfolioROIResponse } from "../models/PortfolioROIResponse";
import type { UnifiedROIResponse } from "../models/UnifiedROIResponse";

export class RoiCalculationsService {
    /**
     * Get Portfolio Roi
     * Calculate comprehensive ROI metrics for the current user's portfolio.
     *
     * Args:
     * period_days: Number of days to look back for performance data (default: 30)
     * @param periodDays
     * @returns PortfolioROIResponse Successful Response
     * @throws ApiError
     */
    public static roiCalculationsGetPortfolioRoi(periodDays: number = 30): CancelablePromise<PortfolioROIResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/roi/portfolio",
            query: {
                period_days: periodDays,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Copy Trading Roi
     * Calculate ROI specifically for copy trading activities.
     *
     * Args:
     * trader_profile_id: Optional specific trader to calculate ROI for
     * @param traderProfileId
     * @returns CopyTradingROIResponse Successful Response
     * @throws ApiError
     */
    public static roiCalculationsGetCopyTradingRoi(traderProfileId?: string | null): CancelablePromise<CopyTradingROIResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/roi/copy-trading",
            query: {
                trader_profile_id: traderProfileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Verify Mathematical Plausibility
     * Verify that all performance data maintains mathematical coherence.
     * @returns MathematicalPlausibilityResponse Successful Response
     * @throws ApiError
     */
    public static roiCalculationsVerifyMathematicalPlausibility(): CancelablePromise<MathematicalPlausibilityResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/roi/plausibility",
        });
    }
    /**
     * Get Performance Vs Benchmark
     * Calculate user performance relative to their strategy benchmark.
     * @returns PerformanceBenchmarkResponse Successful Response
     * @throws ApiError
     */
    public static roiCalculationsGetPerformanceVsBenchmark(): CancelablePromise<PerformanceBenchmarkResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/roi/benchmark",
        });
    }
    /**
     * Admin Verify Mathematical Plausibility
     * Admin endpoint to verify mathematical plausibility for any user.
     * @param userId
     * @returns MathematicalPlausibilityResponse Successful Response
     * @throws ApiError
     */
    public static roiCalculationsAdminVerifyMathematicalPlausibility(userId: string): CancelablePromise<MathematicalPlausibilityResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/roi/admin/plausibility/{user_id}",
            path: {
                user_id: userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Admin Get Portfolio Roi
     * Admin endpoint to calculate ROI for any user.
     * @param userId
     * @param periodDays
     * @returns PortfolioROIResponse Successful Response
     * @throws ApiError
     */
    public static roiCalculationsAdminGetPortfolioRoi(userId: string, periodDays: number = 30): CancelablePromise<PortfolioROIResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/roi/admin/portfolio/{user_id}",
            path: {
                user_id: userId,
            },
            query: {
                period_days: periodDays,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Unified Roi
     * Calculate unified ROI metrics across all account segments.
     *
     * Args:
     * period_days: Number of days to look back for performance data
     * (None for since inception, -1 for YTD, 30 for 30 days)
     * @param periodDays
     * @returns UnifiedROIResponse Successful Response
     * @throws ApiError
     */
    public static roiCalculationsGetUnifiedRoi(periodDays?: number | null): CancelablePromise<UnifiedROIResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/roi/unified",
            query: {
                period_days: periodDays,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Historical Roi
     * Get historical ROI data for the current user.
     *
     * Args:
     * days: Number of days of historical data to retrieve (default: 30)
     * @param days
     * @returns HistoricalROIResponse Successful Response
     * @throws ApiError
     */
    public static roiCalculationsGetHistoricalRoi(days: number = 30): CancelablePromise<Array<HistoricalROIResponse>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/roi/historical",
            query: {
                days: days,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Long Term Roi History
     * Return paginated long-term ROI events for the current user.
     *
     * We read from ExecutionEvent where:
     * - user_id = current_user.id
     * - event_type = FOLLOWER_PROFIT
     * - payload.service == 'LONG_TERM' OR payload.balance_type == 'long_term' OR description ILIKE 'Long-term%'
     * @param page
     * @param pageSize
     * @returns LongTermROIHistoryResponse Successful Response
     * @throws ApiError
     */
    public static roiCalculationsGetLongTermRoiHistory(page: number = 1, pageSize: number = 50): CancelablePromise<LongTermROIHistoryResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/roi/long-term/history",
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
