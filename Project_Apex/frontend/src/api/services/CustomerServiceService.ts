/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class CustomerServiceService {
    /**
     * Handle Chatkit Request
     * FastAPI endpoint that proxies ChatKit requests to the ChatKitServer.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static customerServiceHandleChatkitRequest(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/customer-service/chatkit",
        });
    }
}
