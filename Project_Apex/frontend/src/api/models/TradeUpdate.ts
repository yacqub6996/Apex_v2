/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TradeSide } from "./TradeSide";
import type { TradeStatus } from "./TradeStatus";

export type TradeUpdate = {
    symbol?: string | null;
    side?: TradeSide | null;
    entry_price?: number | null;
    exit_price?: number | null;
    volume?: number | null;
    profit_loss?: number | null;
    status?: TradeStatus | null;
    opened_at?: string;
    closed_at?: string | null;
    notes?: string | null;
};
