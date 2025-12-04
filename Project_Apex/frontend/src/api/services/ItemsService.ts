/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { ItemCreate } from "../models/ItemCreate";
import type { ItemPublic } from "../models/ItemPublic";
import type { ItemUpdate } from "../models/ItemUpdate";
import type { ItemsPublic } from "../models/ItemsPublic";
import type { Message } from "../models/Message";

export class ItemsService {
    /**
     * Read Items
     * Retrieve items.
     * @param skip
     * @param limit
     * @returns ItemsPublic Successful Response
     * @throws ApiError
     */
    public static itemsReadItems(skip?: number, limit: number = 100): CancelablePromise<ItemsPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/items/",
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
     * Create Item
     * Create new item.
     * @param requestBody
     * @returns ItemPublic Successful Response
     * @throws ApiError
     */
    public static itemsCreateItem(requestBody: ItemCreate): CancelablePromise<ItemPublic> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/items/",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Item
     * Get item by ID.
     * @param id
     * @returns ItemPublic Successful Response
     * @throws ApiError
     */
    public static itemsReadItem(id: string): CancelablePromise<ItemPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/items/{id}",
            path: {
                id: id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Item
     * Update an item.
     * @param id
     * @param requestBody
     * @returns ItemPublic Successful Response
     * @throws ApiError
     */
    public static itemsUpdateItem(id: string, requestBody: ItemUpdate): CancelablePromise<ItemPublic> {
        return __request(OpenAPI, {
            method: "PUT",
            url: "/api/v1/items/{id}",
            path: {
                id: id,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Item
     * Delete an item.
     * @param id
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static itemsDeleteItem(id: string): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/v1/items/{id}",
            path: {
                id: id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
