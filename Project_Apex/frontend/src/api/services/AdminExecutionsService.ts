/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { ROIExecutionPushRequest } from "../models/ROIExecutionPushRequest";
import type { ROIExecutionPushResponse } from "../models/ROIExecutionPushResponse";

export class AdminExecutionsService {
    /**
     * Push Roi Execution
     * Push an ROI execution event. In SIMPLE_ROI_MODE, applies ROI to individual users.
     * In normal mode, applies ROI to all active copy relationships for a trader.
     * @param requestBody
     * @returns ROIExecutionPushResponse Successful Response
     * @throws ApiError
     */
    public static adminExecutionsPushRoiExecution(requestBody: ROIExecutionPushRequest): CancelablePromise<ROIExecutionPushResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/executions/push",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Traders For Executions
     * Get list of traders with active copy relationships for ROI execution.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static adminExecutionsGetTradersForExecutions(): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/executions/traders",
        });
    }
    /**
     * Get Trader Followers
     * Get list of followers for a specific trader for ROI execution in SIMPLE_ROI_MODE.
     * @param traderId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static adminExecutionsGetTraderFollowers(traderId: string): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/executions/traders/{trader_id}/followers",
            path: {
                trader_id: traderId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
