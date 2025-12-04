/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { DailyPerformanceCollection } from "../models/DailyPerformanceCollection";
import type { DailyPerformanceCreate } from "../models/DailyPerformanceCreate";
import type { DailyPerformancePublic } from "../models/DailyPerformancePublic";
import type { Message } from "../models/Message";

export class PerformanceService {
    /**
     * Read Performance
     * @param skip
     * @param limit
     * @returns DailyPerformanceCollection Successful Response
     * @throws ApiError
     */
    public static performanceReadPerformance(skip?: number, limit: number = 100): CancelablePromise<DailyPerformanceCollection> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/performance/",
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
     * Create Performance
     * @param requestBody
     * @returns DailyPerformancePublic Successful Response
     * @throws ApiError
     */
    public static performanceCreatePerformance(requestBody: DailyPerformanceCreate): CancelablePromise<DailyPerformancePublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/performance/",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Performance
     * @param recordId
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static performanceDeletePerformance(recordId: string): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/v1/performance/{record_id}",
            path: {
                record_id: recordId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
