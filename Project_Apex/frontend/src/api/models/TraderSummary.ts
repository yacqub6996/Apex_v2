/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RiskTolerance } from "./RiskTolerance";

export type TraderSummary = {
    id: string;
    trader_code: string;
    display_name: string;
    specialty: string;
    risk_level: RiskTolerance;
    performance: string;
    win_rate: string;
    avatar_url?: string | null;
    readonly traderCode: string;
    readonly displayName: string;
    readonly riskLevel: string;
    readonly winRate: string;
};
