/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { SendEmailPayload } from "../models/SendEmailPayload";

export class EmailService {
    /**
     * Send Email Endpoint
     * Send an email using Hostinger SMTP credentials from .env.
     * @param requestBody
     * @returns string Successful Response
     * @throws ApiError
     */
    public static emailSendEmailEndpoint(requestBody: SendEmailPayload): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/email/send-email",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
