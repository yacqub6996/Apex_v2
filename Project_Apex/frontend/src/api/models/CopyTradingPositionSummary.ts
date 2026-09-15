/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CopyStatus } from "./CopyStatus";
import type { RiskTolerance } from "./RiskTolerance";

export type CopyTradingPositionSummary = {
    id: string;
    trader_code: string;
    display_name: string;
    specialty: string;
    risk_level: RiskTolerance;
    performance: string;
    win_rate: string;
    avatar_url?: string | null;
    copy_id: string;
    allocation: number;
    status: CopyStatus;
    total_profit: number;
    roi_percentage: number;
    session_trade_count: number;
    session_win_rate: number;
    readonly traderCode: string;
    readonly displayName: string;
    readonly riskLevel: string;
    readonly winRate: string;
};
