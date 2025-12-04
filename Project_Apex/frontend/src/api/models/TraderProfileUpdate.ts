/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RiskTolerance } from "./RiskTolerance";

export type TraderProfileUpdate = {
    trading_strategy?: string | null;
    risk_tolerance?: RiskTolerance | null;
    is_public?: boolean | null;
    copy_fee_percentage?: number | null;
    minimum_copy_amount?: number | null;
    display_name?: string | null;
    total_copiers?: number | null;
    total_assets_under_copy?: number | null;
    average_monthly_return?: number | null;
};
