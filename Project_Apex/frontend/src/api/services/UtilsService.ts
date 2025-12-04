/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { Message } from "../models/Message";

export class UtilsService {
    /**
     * Test Email
     * Test emails.
     * @param emailTo
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static utilsTestEmail(emailTo: string): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/utils/test-email/",
            query: {
                email_to: emailTo,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Health Check
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public static utilsHealthCheck(): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/utils/health-check/",
        });
    }
}
