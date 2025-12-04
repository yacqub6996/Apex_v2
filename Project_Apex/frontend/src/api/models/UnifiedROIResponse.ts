/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CopyTradingROIResponse } from "./CopyTradingROIResponse";
import type { PortfolioROIResponse } from "./PortfolioROIResponse";

export type UnifiedROIResponse = {
    overall_roi_percentage: number;
    total_equity: number;
    total_deposits: number;
    wallet_balance: number;
    copy_trading_balance: number;
    wallet_allocation_percentage: number;
    copy_trading_allocation_percentage: number;
    portfolio_roi: PortfolioROIResponse;
    copy_trading_roi: CopyTradingROIResponse;
    is_balanced: boolean;
    recommended_action: string;
    period_days?: number | null;
    period_label: string;
    actively_invested_roi_percentage: number;
    actively_invested_profit_loss: number;
};
