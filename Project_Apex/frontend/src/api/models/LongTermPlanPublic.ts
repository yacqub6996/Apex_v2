/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LongTermPlanTier } from "./LongTermPlanTier";

export type LongTermPlanPublic = {
    name: string;
    tier?: LongTermPlanTier | null;
    minimum_deposit: number;
    maximum_deposit?: number | null;
    description?: string | null;
    due_date?: string | null;
    id: string;
    created_at: string;
};
