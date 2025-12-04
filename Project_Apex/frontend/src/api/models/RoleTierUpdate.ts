/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountTier } from "./AccountTier";
import type { UserRole } from "./UserRole";

export type RoleTierUpdate = {
    role?: UserRole | null;
    account_tier?: AccountTier | null;
    is_active?: boolean | null;
};
