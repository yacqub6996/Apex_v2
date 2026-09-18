/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CopiedTraderSummary } from "./CopiedTraderSummary";

export type CopyTradingUpdateResponse = {
    success: boolean;
    message: string;
    available_balance: number;
    copied_trader: CopiedTraderSummary;
    commission_due?: number;
    session_profit?: number;
    copy_fee_percentage?: number;
    trader_name?: string | null;
    released_equity?: number;
};
