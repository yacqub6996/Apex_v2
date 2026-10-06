/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AvailableNetworkPublic } from "./AvailableNetworkPublic";

export type AvailableCoinPublic = {
    coin: string;
    display_name: string;
    coingecko_id?: string | null;
    fallback_rate?: number | null;
    networks: Array<AvailableNetworkPublic>;
};
