/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { ConfirmPaymentRequest } from "../models/ConfirmPaymentRequest";
import type { CryptoRates } from "../models/CryptoRates";
import type { GenerateAddressRequest } from "../models/GenerateAddressRequest";
import type { GenerateAddressResponse } from "../models/GenerateAddressResponse";
import type { NetworkInfo } from "../models/NetworkInfo";
import type { TransactionPublic } from "../models/TransactionPublic";

export class CryptoService {
    /**
     * Get Available Networks
     * Get list of available crypto networks for deposits/withdrawals
     * @returns NetworkInfo Successful Response
     * @throws ApiError
     */
    public static cryptoGetAvailableNetworks(): CancelablePromise<Array<NetworkInfo>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/crypto/networks",
        });
    }
    /**
     * Get Crypto Rates
     * Get current crypto to USD exchange rates from CoinGecko API.
     * Falls back to static rates if API key is not configured or request fails.
     * @returns CryptoRates Successful Response
     * @throws ApiError
     */
    public static cryptoGetCryptoRates(): CancelablePromise<CryptoRates> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/crypto/rates",
        });
    }
    /**
     * Generate Deposit Address
     * Generate a deposit address for the user.
     * Creates a pending transaction with address expiry (20 minutes).
     * Uses live prices from CoinGecko API when available.
     * @param requestBody
     * @returns GenerateAddressResponse Successful Response
     * @throws ApiError
     */
    public static cryptoGenerateDepositAddress(requestBody: GenerateAddressRequest): CancelablePromise<GenerateAddressResponse> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/crypto/generate-address",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Confirm Payment Sent
     * User confirms they have sent the crypto payment.
     * Updates transaction to mark user confirmation for admin review.
     * @param requestBody
     * @returns TransactionPublic Successful Response
     * @throws ApiError
     */
    public static cryptoConfirmPaymentSent(requestBody: ConfirmPaymentRequest): CancelablePromise<TransactionPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/crypto/confirm-payment",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Pending Deposits
     * Get user's pending deposit transactions
     * @returns TransactionPublic Successful Response
     * @throws ApiError
     */
    public static cryptoGetPendingDeposits(): CancelablePromise<Array<TransactionPublic>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/crypto/pending-deposits",
        });
    }
}
