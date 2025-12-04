/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LongTermPlanTier } from "./LongTermPlanTier";

export type LongTermPlanSummary = {
    id: string;
    name: string;
    tier: LongTermPlanTier;
    minimum_deposit: number;
    maximum_deposit?: number | null;
    description?: string | null;
    active_investments: number;
    total_allocated: number;
};
