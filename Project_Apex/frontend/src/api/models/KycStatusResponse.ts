/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KycStatus } from "./KycStatus";

export type KycStatusResponse = {
    status: KycStatus;
    submitted_at: string | null;
    approved_at: string | null;
    rejected_reason: string | null;
    notes: string | null;
};
