/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { PrivateUserCreate } from "../models/PrivateUserCreate";
import type { UserPublic } from "../models/UserPublic";

export class PrivateService {
    /**
     * Create User
     * Create a new user.
     * @param requestBody
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static privateCreateUser(requestBody: PrivateUserCreate): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/private/users/",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
