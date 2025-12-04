/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LongTermInvestmentItem } from "./LongTermInvestmentItem";

export type SubscribeLongTermResponse = {
    success: boolean;
    long_term_balance: number;
    wallet_balance: number;
    investment: LongTermInvestmentItem;
};
