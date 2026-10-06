/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CopyTradingStopPreviewResponse = {
    copy_id: string;
    trader_name: string;
    allocation: number;
    session_profit: number;
    copy_fee_percentage: number;
    commission_due: number;
    release_amount: number;
    held_released_equity: number;
    immediate_release_amount: number;
    equity_released: boolean;
    requires_commission_deposit: boolean;
    notice: string;
    readonly copyId: string;
    readonly traderName: string;
    readonly sessionProfit: number;
    readonly copyFeePercentage: number;
    readonly commissionDue: number;
    readonly releaseAmount: number;
    readonly heldReleasedEquity: number;
    readonly immediateReleaseAmount: number;
    readonly equityReleased: boolean;
    readonly requiresCommissionDeposit: boolean;
};
