/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UpcomingMaturityItem } from "./UpcomingMaturityItem";

/**
 * Response model for upcoming maturities.
 */
export type UpcomingMaturitiesResponse = {
    maturities: Array<UpcomingMaturityItem>;
    total_count: number;
    total_amount: number;
    next_30_days: number;
    next_90_days: number;
};
