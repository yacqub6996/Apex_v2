/* generated using openapi-typescript-codegen -- extended manually */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CopyTradingPositionSummary } from "./CopyTradingPositionSummary";

export type CopyTradingSummaryResponse = {
    wallet_balance: number;
    copy_trading_wallet_balance: number;
    total_allocation: number;
    total_profit: number;
    copy_trading_roi_percentage: number;
    active_positions: number;
    paused_positions: number;
    stopped_positions: number;
    positions: Array<CopyTradingPositionSummary>;
};

