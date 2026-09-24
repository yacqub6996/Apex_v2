/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response returned after successfully consuming a verification link.
 */
export type VerifyEmailResponse = {
    message: string;
    handoff_token: string;
    handoff_expires_in: number;
};
