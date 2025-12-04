/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { LongTermRoiPushRequest } from "../models/LongTermRoiPushRequest";
import type { LongTermRoiPushResponse } from "../models/LongTermRoiPushResponse";

export class AdminLongTermRoiService {
    /**
     * Push Long Term Roi
     * Push a long-term ROI execution event to a specific user's long-term balance.
     * @param requestBody
     * @returns LongTermRoiPushResponse Successful Response
     * @throws ApiError
     */
    public static adminLongTermRoiPushLongTermRoi(requestBody: LongTermRoiPushRequest): CancelablePromise<LongTermRoiPushResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/admin/long-term-roi/push",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
