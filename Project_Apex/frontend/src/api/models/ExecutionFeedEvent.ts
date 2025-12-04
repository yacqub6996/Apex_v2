/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExecutionEventType } from "./ExecutionEventType";

export type ExecutionFeedEvent = {
    id: string;
    event_type: ExecutionEventType;
    description: string;
    amount: number;
    symbol?: string | null;
    trader_display_name?: string | null;
    trader_code?: string | null;
    created_at: string;
    readonly eventType: string;
    readonly traderDisplayName: string | null;
    readonly traderCode: string | null;
    readonly createdAt: string;
};
