/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KycDocumentType } from "./KycDocumentType";

export type Body_kyc_upload_kyc_document = {
    document_type: KycDocumentType;
    file: Blob;
    side?: string;
};
