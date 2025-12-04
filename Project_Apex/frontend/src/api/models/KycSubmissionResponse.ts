/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KycStatus } from "./KycStatus";
import type { UserProfilePublic } from "./UserProfilePublic";

export type KycSubmissionResponse = {
    profile: UserProfilePublic;
    status: KycStatus;
    submitted_at: string | null;
};
