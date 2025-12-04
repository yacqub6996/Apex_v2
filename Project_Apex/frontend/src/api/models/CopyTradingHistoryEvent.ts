/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExecutionEventType } from "./ExecutionEventType";

export type CopyTradingHistoryEvent = {
    id: string;
    event_type: ExecutionEventType;
    description: string;
    amount: number;
    roi_percent?: number | null;
    symbol?: string | null;
    trader_display_name?: string | null;
    trader_code?: string | null;
    created_at: string;
    readonly eventType: string;
    readonly roiPercent: string | null;
    readonly traderDisplayName: string | null;
    readonly traderCode: string | null;
    readonly createdAt: string;
};
