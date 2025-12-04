/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserRole } from "./UserRole";

/**
 * Auth token response schema for login.
 */
export type Token = {
    access_token: string;
    token_type?: string;
    role: UserRole;
};
