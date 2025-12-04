/* generated using openapi-typescript-codegen -- extended manually */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CopiedTraderSummary } from "./CopiedTraderSummary";

export type CopyTradingPositionSummary = CopiedTraderSummary & {
    total_profit: number;
    roi_percentage: number;
    session_trade_count: number;
    session_win_rate: number;
};
