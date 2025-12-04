/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CopiedTraderSummary } from "./CopiedTraderSummary";

export type CopyTradingStartResponse = {
    success: boolean;
    message: string;
    available_balance: number;
    copied_trader?: CopiedTraderSummary | null;
};
