/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { ROIReversalRequest } from "../models/ROIReversalRequest";
import type { ROIReversalResponse } from "../models/ROIReversalResponse";

export class AdminRoiReversalService {
    /**
     * Reverse Roi Transaction
     * Reverse an existing ROI transaction.
     * @param requestBody
     * @returns ROIReversalResponse Successful Response
     * @throws ApiError
     */
    public static adminRoiReversalReverseRoiTransaction(requestBody: ROIReversalRequest): CancelablePromise<ROIReversalResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/reverse-roi",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
