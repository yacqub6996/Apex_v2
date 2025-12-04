/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { Message } from "../models/Message";
import type { TradeCreate } from "../models/TradeCreate";
import type { TradePublic } from "../models/TradePublic";
import type { TradeUpdate } from "../models/TradeUpdate";
import type { TradesPublic } from "../models/TradesPublic";

export class TradesService {
    /**
     * Read Trades
     * @param skip
     * @param limit
     * @returns TradesPublic Successful Response
     * @throws ApiError
     */
    public static tradesReadTrades(skip?: number, limit: number = 100): CancelablePromise<TradesPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/trades/",
            query: {
                skip: skip,
                limit: limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Trade
     * @param requestBody
     * @returns TradePublic Successful Response
     * @throws ApiError
     */
    public static tradesCreateTrade(requestBody: TradeCreate): CancelablePromise<TradePublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/trades/",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Trade
     * @param tradeId
     * @param requestBody
     * @returns TradePublic Successful Response
     * @throws ApiError
     */
    public static tradesUpdateTrade(tradeId: string, requestBody: TradeUpdate): CancelablePromise<TradePublic> {
        return __request(OpenAPI, {
            method: "PUT",
            url: "/api/v1/trades/{trade_id}",
            path: {
                trade_id: tradeId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Trade
     * @param tradeId
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static tradesDeleteTrade(tradeId: string): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/v1/trades/{trade_id}",
            path: {
                trade_id: tradeId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
