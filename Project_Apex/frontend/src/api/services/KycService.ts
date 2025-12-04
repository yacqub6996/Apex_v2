/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { Body_kyc_upload_kyc_document } from "../models/Body_kyc_upload_kyc_document";
import type { KycApplicationDetail } from "../models/KycApplicationDetail";
import type { KycApplicationPublic } from "../models/KycApplicationPublic";
import type { KycDocumentPublic } from "../models/KycDocumentPublic";
import type { KycDocumentsPublic } from "../models/KycDocumentsPublic";
import type { KycRejectionPayload } from "../models/KycRejectionPayload";
import type { KycStatusResponse } from "../models/KycStatusResponse";
import type { KycSubmission } from "../models/KycSubmission";
import type { KycSubmissionResponse } from "../models/KycSubmissionResponse";
import type { UserProfilePublic } from "../models/UserProfilePublic";
import type { UserPublic } from "../models/UserPublic";

export class KycService {
    /**
     * Get Profile
     * @returns any Successful Response
     * @throws ApiError
     */
    public static kycGetProfile(): CancelablePromise<UserProfilePublic | null> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/kyc/profile",
        });
    }
    /**
     * Submit Kyc Information
     * @param requestBody
     * @returns KycSubmissionResponse Successful Response
     * @throws ApiError
     */
    public static kycSubmitKycInformation(requestBody: KycSubmission): CancelablePromise<KycSubmissionResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/kyc/submit",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Kyc Status
     * @returns KycStatusResponse Successful Response
     * @throws ApiError
     */
    public static kycGetKycStatus(): CancelablePromise<KycStatusResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/kyc/status",
        });
    }
    /**
     * List Documents
     * @returns KycDocumentsPublic Successful Response
     * @throws ApiError
     */
    public static kycListDocuments(): CancelablePromise<KycDocumentsPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/kyc/documents",
        });
    }
    /**
     * Upload Kyc Document
     * @param formData
     * @returns KycDocumentPublic Successful Response
     * @throws ApiError
     */
    public static kycUploadKycDocument(formData: Body_kyc_upload_kyc_document): CancelablePromise<KycDocumentPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/kyc/documents",
            formData: formData,
            mediaType: "multipart/form-data",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Pending Applications
     * @returns KycApplicationPublic Successful Response
     * @throws ApiError
     */
    public static kycListPendingApplications(): CancelablePromise<Array<KycApplicationPublic>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/kyc/applications/pending",
        });
    }
    /**
     * Get Application Detail
     * @param userId
     * @returns KycApplicationDetail Successful Response
     * @throws ApiError
     */
    public static kycGetApplicationDetail(userId: string): CancelablePromise<KycApplicationDetail> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/kyc/applications/{user_id}",
            path: {
                user_id: userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bulk Download Documents
     * Zip and stream selected KYC documents for a user. If ids is omitted, include all.
     * @param userId
     * @param ids
     * @returns any Successful Response
     * @throws ApiError
     */
    public static kycBulkDownloadDocuments(userId: string, ids?: string | null): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/kyc/applications/{user_id}/documents/bulk-download",
            path: {
                user_id: userId,
            },
            query: {
                ids: ids,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * View Document
     * Get document details and view URL for admin inspection
     * @param documentId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static kycViewDocument(documentId: string): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/kyc/documents/{document_id}/view",
            path: {
                document_id: documentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Approve Application
     * @param userId
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static kycApproveApplication(userId: string): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/kyc/applications/{user_id}/approve",
            path: {
                user_id: userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reject Application
     * @param userId
     * @param requestBody
     * @returns UserPublic Successful Response
     * @throws ApiError
     */
    public static kycRejectApplication(userId: string, requestBody: KycRejectionPayload): CancelablePromise<UserPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/kyc/applications/{user_id}/reject",
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
