/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RiskTolerance } from "./RiskTolerance";

export type TraderProfilePublic = {
    trading_strategy?: string | null;
    risk_tolerance?: RiskTolerance;
    performance_metrics?: Record<string, any> | null;
    is_public?: boolean;
    copy_fee_percentage?: number;
    minimum_copy_amount?: number;
    total_copiers?: number;
    total_assets_under_copy?: number;
    average_monthly_return?: number;
    id: string;
    user_id: string;
    display_name: string;
    trader_code: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
};
