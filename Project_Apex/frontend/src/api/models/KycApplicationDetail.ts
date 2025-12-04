/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KycDocumentPublic } from "./KycDocumentPublic";
import type { UserProfilePublic } from "./UserProfilePublic";
import type { UserPublic } from "./UserPublic";

export type KycApplicationDetail = {
    user: UserPublic;
    profile: UserProfilePublic | null;
    documents: Array<KycDocumentPublic>;
};
