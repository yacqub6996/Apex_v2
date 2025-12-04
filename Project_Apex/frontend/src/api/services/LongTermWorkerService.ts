/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { UpcomingMaturitiesResponse } from "../models/UpcomingMaturitiesResponse";
import type { WorkerStatusResponse } from "../models/WorkerStatusResponse";

export class LongTermWorkerService {
    /**
     * Get Worker Status
     * Get the status of the long-term worker and scheduler.
     * @returns WorkerStatusResponse Successful Response
     * @throws ApiError
     */
    public static longTermWorkerGetWorkerStatus(): CancelablePromise<WorkerStatusResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/long-term-worker/status",
        });
    }
    /**
     * Run Maturity Processing Now
     * Manually trigger maturity processing (admin only).
     * @returns any Successful Response
     * @throws ApiError
     */
    public static longTermWorkerRunMaturityProcessingNow(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/long-term-worker/run-now",
        });
    }
    /**
     * Get Upcoming Maturities Endpoint
     * Get investments maturing in the next specified number of days.
     * @param daysAhead
     * @returns UpcomingMaturitiesResponse Successful Response
     * @throws ApiError
     */
    public static longTermWorkerGetUpcomingMaturitiesEndpoint(daysAhead: number = 90): CancelablePromise<UpcomingMaturitiesResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/long-term-worker/upcoming-maturities",
            query: {
                days_ahead: daysAhead,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get User Upcoming Maturities
     * Get the current user's investments maturing in the next specified number of days.
     * @param daysAhead
     * @returns UpcomingMaturitiesResponse Successful Response
     * @throws ApiError
     */
    public static longTermWorkerGetUserUpcomingMaturities(daysAhead: number = 90): CancelablePromise<UpcomingMaturitiesResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/long-term-worker/user/upcoming-maturities",
            query: {
                days_ahead: daysAhead,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
