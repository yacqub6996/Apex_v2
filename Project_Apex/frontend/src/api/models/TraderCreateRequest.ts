/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RiskTolerance } from "./RiskTolerance";

/**
 * Request model for creating a trader profile.
 */
export type TraderCreateRequest = {
    user_id: string;
    display_name: string;
    specialty: string;
    risk_level: RiskTolerance;
    trading_strategy?: string | null;
    is_public?: boolean;
    copy_fee_percentage?: number;
    minimum_copy_amount?: number;
    total_copiers?: number | null;
    total_assets_under_copy?: number | null;
    average_monthly_return?: number | null;
};
