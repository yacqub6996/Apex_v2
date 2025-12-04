/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TradeSide } from "./TradeSide";
import type { TradeStatus } from "./TradeStatus";

export type TradePublic = {
    symbol: string;
    side?: TradeSide;
    entry_price: number;
    exit_price?: number | null;
    volume: number;
    profit_loss?: number | null;
    status?: TradeStatus;
    opened_at?: string;
    closed_at?: string | null;
    notes?: string | null;
    id: string;
};
