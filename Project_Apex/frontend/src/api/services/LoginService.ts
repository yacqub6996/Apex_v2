/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { Body_login_login_access_token } from "../models/Body_login_login_access_token";
import type { EmailVerificationToken } from "../models/EmailVerificationToken";
import type { ExchangeVerificationRequest } from "../models/ExchangeVerificationRequest";
import type { Message } from "../models/Message";
import type { NewPassword } from "../models/NewPassword";
import type { ResendEmailVerification } from "../models/ResendEmailVerification";
import type { Token } from "../models/Token";
import type { UserPublic } from "../models/UserPublic";
import type { VerifyEmailResponse } from "../models/VerifyEmailResponse";

export class LoginService {
    /**
     * Login Access Token
     * OAuth2 compatible token login, get an access token for future requests
     * @param formData
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static loginLoginAccessToken(formData: Body_login_login_access_token): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/login/access-token",
            formData: formData,
            mediaType: "application/x-www-form-urlencoded",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Login With Google
     * Exchange a Google ID token for an application access token.
     *
     * Expects JSON body: {"id_token": "..."}
     * @param requestBody
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static loginLoginWithGoogle(requestBody: Record<string, string>): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/login/google",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Test Token
     * Test access token
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static loginTestToken(): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/login/test-token",
        });
    }
    /**
     * Recover Password
     * Password Recovery
     * @param email
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static loginRecoverPassword(email: string): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/password-recovery/{email}",
            path: {
                email: email,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Request Password Reset
     * Password reset entrypoint used by the frontend.
     *
     * Behaviour:
     * - When email sending is configured, dispatch a standard reset email with a tokenised link.
     * - Otherwise, log the request for manual processing.
     * - Always return a generic success message to avoid user enumeration.
     * @param email
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static loginRequestPasswordReset(email: string): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/password-reset-request",
            query: {
                email: email,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Legacy Password Reset Request
     * Backwards-compatible alias for older frontend builds that still call
     * `/login/password-reset-request`. New clients should use `/password-reset-request`.
     * @param email
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static loginLegacyPasswordResetRequest(email: string): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/login/password-reset-request",
            query: {
                email: email,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reset Password
     * Reset password
     * @param requestBody
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static loginResetPassword(requestBody: NewPassword): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/reset-password/",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Recover Password Html Content
     * HTML Content for Password Recovery
     * @param email
     * @returns string Successful Response
     * @throws ApiError
     */
    public static loginRecoverPasswordHtmlContent(email: string): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/password-recovery-html-content/{email}",
            path: {
                email: email,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Request Email Verification
     * Send (or log) an email verification link for the current user.
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static loginRequestEmailVerification(): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/request-email-verification",
        });
    }
    /**
     * Resend Email Verification
     * Request a new verification email without holding an access token.
     *
     * The response is identical for unknown, already-verified, and unverified
     * addresses so callers cannot enumerate accounts. Abuse protection is
     * enforced server-side with PostgreSQL advisory locks plus a persisted
     * attempt ledger keyed by HMAC digests.
     * @param requestBody
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static loginResendEmailVerification(requestBody: ResendEmailVerification): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/resend-email-verification",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Verify Email
     * Accept a verification token and mark the user as verified if valid.
     *
     * On success a short-lived, single-use handoff token is returned so the
     * frontend can exchange it for a normal access token. The access token
     * itself is never returned directly from this endpoint.
     * @param requestBody
     * @returns VerifyEmailResponse Successful Response
     * @throws ApiError
     */
    public static loginVerifyEmail(requestBody: EmailVerificationToken): CancelablePromise<VerifyEmailResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/verify-email",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Exchange Verification
     * Exchange a single-use post-verification handoff for an access token.
     * @param requestBody
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static loginExchangeVerification(requestBody: ExchangeVerificationRequest): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/login/exchange-verification",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
