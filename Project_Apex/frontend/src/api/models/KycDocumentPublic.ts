/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KycDocumentType } from "./KycDocumentType";

export type KycDocumentPublic = {
    id: string;
    user_id: string;
    document_type: KycDocumentType;
    front_image_url: string | null;
    back_image_url: string | null;
    verified: boolean;
    verified_by: string | null;
    verified_at: string | null;
    created_at: string;
};
