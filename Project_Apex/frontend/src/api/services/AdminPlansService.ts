/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { LongTermPlanPublic } from "../models/LongTermPlanPublic";
import type { PlanCreate } from "../models/PlanCreate";
import type { PlanUpdate } from "../models/PlanUpdate";

export class AdminPlansService {
    /**
     * List Plans
     * @returns LongTermPlanPublic Successful Response
     * @throws ApiError
     */
    public static adminPlansListPlans(): CancelablePromise<Array<LongTermPlanPublic>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/plans/",
        });
    }
    /**
     * Create Plan
     * @param requestBody
     * @returns LongTermPlanPublic Successful Response
     * @throws ApiError
     */
    public static adminPlansCreatePlan(requestBody: PlanCreate): CancelablePromise<LongTermPlanPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/plans/",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Plan
     * @param planId
     * @returns LongTermPlanPublic Successful Response
     * @throws ApiError
     */
    public static adminPlansReadPlan(planId: string): CancelablePromise<LongTermPlanPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/plans/{plan_id}",
            path: {
                plan_id: planId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Plan
     * @param planId
     * @param requestBody
     * @returns LongTermPlanPublic Successful Response
     * @throws ApiError
     */
    public static adminPlansUpdatePlan(planId: string, requestBody: PlanUpdate): CancelablePromise<LongTermPlanPublic> {
        return __request(OpenAPI, {
            method: "PUT",
            url: "/api/v1/admin/plans/{plan_id}",
            path: {
                plan_id: planId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Plan
     * @param planId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static adminPlansDeletePlan(planId: string): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/v1/admin/plans/{plan_id}",
            path: {
                plan_id: planId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
