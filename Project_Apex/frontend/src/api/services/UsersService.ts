/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { AccountSummaryBase } from "../models/AccountSummaryBase";
import type { AccountSummaryPublic } from "../models/AccountSummaryPublic";
import type { BalanceResponse } from "../models/BalanceResponse";
import type { BalanceUpdate } from "../models/BalanceUpdate";
import type { Body_users_upload_profile_picture } from "../models/Body_users_upload_profile_picture";
import type { KycDecision } from "../models/KycDecision";
import type { Message } from "../models/Message";
import type { RoleTierUpdate } from "../models/RoleTierUpdate";
import type { UpdatePassword } from "../models/UpdatePassword";
import type { UserCreate } from "../models/UserCreate";
import type { UserMeResponse } from "../models/UserMeResponse";
import type { UserPublic } from "../models/UserPublic";
import type { UserRegister } from "../models/UserRegister";
import type { UserUpdate } from "../models/UserUpdate";
import type { UserUpdateMe } from "../models/UserUpdateMe";
import type { UsersPublic } from "../models/UsersPublic";

export class UsersService {
    /**
     * Read Users
     * @param skip
     * @param limit
     * @returns UsersPublic Successful Response
     * @throws ApiError
     */
    public static usersReadUsers(skip?: number, limit: number = 100): CancelablePromise<UsersPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/users/",
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
     * Create User
     * @param requestBody
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static usersCreateUser(requestBody: UserCreate): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/users/",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read User Me
     * @returns UserMeResponse Successful Response
     * @throws ApiError
     */
    public static usersReadUserMe(): CancelablePromise<UserMeResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/users/me",
        });
    }
    /**
     * Update User Me
     * @param requestBody
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static usersUpdateUserMe(requestBody: UserUpdateMe): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/v1/users/me",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Password Me
     * @param requestBody
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static usersUpdatePasswordMe(requestBody: UpdatePassword): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/v1/users/me/password",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Profile Picture
     * @param formData
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static usersUploadProfilePicture(formData: Body_users_upload_profile_picture): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/users/profile-picture",
            formData: formData,
            mediaType: "multipart/form-data",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Register User
     * @param requestBody
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static usersRegisterUser(requestBody: UserRegister): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/users/signup",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read User By Id
     * @param userId
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static usersReadUserById(userId: string): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/users/{user_id}",
            path: {
                user_id: userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update User
     * @param userId
     * @param requestBody
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static usersUpdateUser(userId: string, requestBody: UserUpdate): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/v1/users/{user_id}",
            path: {
                user_id: userId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete User
     * @param userId
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static usersDeleteUser(userId: string): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/v1/users/{user_id}",
            path: {
                user_id: userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read User Balance
     * @param userId
     * @returns BalanceResponse Successful Response
     * @throws ApiError
     */
    public static usersReadUserBalance(userId: string): CancelablePromise<BalanceResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/users/{user_id}/balance",
            path: {
                user_id: userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update User Balance
     * @param userId
     * @param requestBody
     * @returns BalanceResponse Successful Response
     * @throws ApiError
     */
    public static usersUpdateUserBalance(userId: string, requestBody: BalanceUpdate): CancelablePromise<BalanceResponse> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/v1/users/{user_id}/balance",
            path: {
                user_id: userId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Kyc Status
     * @param userId
     * @param requestBody
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static usersUpdateKycStatus(userId: string, requestBody: KycDecision): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/users/{user_id}/kyc/decision",
            path: {
                user_id: userId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Role Or Tier
     * @param userId
     * @param requestBody
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static usersUpdateRoleOrTier(userId: string, requestBody: RoleTierUpdate): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/v1/users/{user_id}/role",
            path: {
                user_id: userId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Account Summary
     * @param userId
     * @returns AccountSummaryPublic Successful Response
     * @throws ApiError
     */
    public static usersGetAccountSummary(userId: string): CancelablePromise<AccountSummaryPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/users/{user_id}/account-summary",
            path: {
                user_id: userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upsert Account Summary
     * @param userId
     * @param requestBody
     * @returns AccountSummaryPublic Successful Response
     * @throws ApiError
     */
    public static usersUpsertAccountSummary(userId: string, requestBody: AccountSummaryBase): CancelablePromise<AccountSummaryPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/users/{user_id}/account-summary",
            path: {
                user_id: userId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
