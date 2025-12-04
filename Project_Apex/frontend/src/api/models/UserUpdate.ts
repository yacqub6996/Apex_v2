/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountTier } from "./AccountTier";
import type { KycStatus } from "./KycStatus";
import type { UserRole } from "./UserRole";

export type UserUpdate = {
    email?: string | null;
    is_active?: boolean;
    is_superuser?: boolean;
    full_name?: string | null;
    password?: string | null;
    role?: UserRole | null;
    account_tier?: AccountTier | null;
    kyc_status?: KycStatus | null;
    kyc_notes?: string | null;
};
