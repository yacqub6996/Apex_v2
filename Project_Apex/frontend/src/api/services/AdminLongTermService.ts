/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { LongTermPlanSummary } from "../models/LongTermPlanSummary";
import type { LongTermPlanUpdate } from "../models/LongTermPlanUpdate";
import type { LongTermRoiPushRequest } from "../models/LongTermRoiPushRequest";
import type { LongTermRoiPushResponse } from "../models/LongTermRoiPushResponse";
import type { LongTermUserRoiPushRequest } from "../models/LongTermUserRoiPushRequest";
import type { MaturityRunResponse } from "../models/MaturityRunResponse";
import type { PlanInvestorPublic } from "../models/PlanInvestorPublic";

export class AdminLongTermService {
    /**
     * List Long Term Plans For Admin
     * Return long-term plan metadata with aggregate allocation data.
     * @returns LongTermPlanSummary Successful Response
     * @throws ApiError
     */
    public static adminLongTermListLongTermPlansForAdmin(): CancelablePromise<Array<LongTermPlanSummary>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/long-term/plans",
        });
    }
    /**
     * Update Long Term Plan
     * Allow admins to update plan metadata such as minimum deposit.
     * @param planId
     * @param requestBody
     * @returns LongTermPlanSummary Successful Response
     * @throws ApiError
     */
    public static adminLongTermUpdateLongTermPlan(planId: string, requestBody: LongTermPlanUpdate): CancelablePromise<LongTermPlanSummary> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/v1/admin/long-term/plans/{plan_id}",
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
     * Push Long Term Roi
     * Apply an ROI percentage to all active investments on a plan.
     * @param requestBody
     * @returns LongTermRoiPushResponse Successful Response
     * @throws ApiError
     */
    public static adminLongTermPushLongTermRoi(requestBody: LongTermRoiPushRequest): CancelablePromise<LongTermRoiPushResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/long-term/push",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Run Maturity Worker
     * @returns MaturityRunResponse Successful Response
     * @throws ApiError
     */
    public static adminLongTermRunMaturityWorker(): CancelablePromise<MaturityRunResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/long-term/maturity/run",
        });
    }
    /**
     * List Plan Investors
     * List active investors for a specific long-term plan with allocations.
     * @param planId
     * @returns PlanInvestorPublic Successful Response
     * @throws ApiError
     */
    public static adminLongTermListPlanInvestors(planId: string): CancelablePromise<Array<PlanInvestorPublic>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/admin/long-term/plans/{plan_id}/investors",
            path: {
                plan_id: planId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Push Long Term Roi For User
     * Apply an ROI percentage to a single user's active investment on a plan.
     * @param requestBody
     * @returns LongTermRoiPushResponse Successful Response
     * @throws ApiError
     */
    public static adminLongTermPushLongTermRoiForUser(requestBody: LongTermUserRoiPushRequest): CancelablePromise<LongTermRoiPushResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/long-term/push/user",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
