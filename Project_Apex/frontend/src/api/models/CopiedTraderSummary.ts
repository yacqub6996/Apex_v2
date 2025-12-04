/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CopyStatus } from "./CopyStatus";
import type { RiskTolerance } from "./RiskTolerance";

export type CopiedTraderSummary = {
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
    readonly traderCode: string;
    readonly displayName: string;
    readonly riskLevel: string;
    readonly winRate: string;
};
