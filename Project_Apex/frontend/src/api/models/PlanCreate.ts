/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LongTermPlanTier } from "./LongTermPlanTier";

export type PlanCreate = {
    name: string;
    tier: LongTermPlanTier;
    minimum_deposit: number;
    description?: string | null;
    due_date?: string | null;
};
