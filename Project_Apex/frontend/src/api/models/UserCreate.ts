/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountTier } from "./AccountTier";
import type { KycStatus } from "./KycStatus";
import type { UserRole } from "./UserRole";

export type UserCreate = {
    email: string;
    is_active?: boolean;
    is_superuser?: boolean;
    full_name?: string | null;
    password: string;
    role?: UserRole;
    account_tier?: AccountTier;
    kyc_status?: KycStatus;
    kyc_notes?: string | null;
};
