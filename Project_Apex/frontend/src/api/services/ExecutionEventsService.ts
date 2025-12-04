/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { ExecutionEventResponse } from "../models/ExecutionEventResponse";
import type { ExecutionEventType } from "../models/ExecutionEventType";
import type { ExecutionEventsList } from "../models/ExecutionEventsList";

export class ExecutionEventsService {
    /**
     * List Execution Events
     * List execution events with filtering and pagination.
     * Users can only see their own events, admins can see all events.
     * @param page
     * @param pageSize
     * @param eventType
     * @param userId
     * @param traderProfileId
     * @param startDate
     * @param endDate
     * @returns ExecutionEventsList Successful Response
     * @throws ApiError
     */
    public static executionEventsListExecutionEvents(
        page: number = 1,
        pageSize: number = 50,
        eventType?: ExecutionEventType | null,
        userId?: string | null,
        traderProfileId?: string | null,
        startDate?: string | null,
        endDate?: string | null,
    ): CancelablePromise<ExecutionEventsList> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/execution-events",
            query: {
                page: page,
                page_size: pageSize,
                event_type: eventType,
                user_id: userId,
                trader_profile_id: traderProfileId,
                start_date: startDate,
                end_date: endDate,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Execution Event
     * Get a specific execution event by ID.
     * Users can only see their own events, admins can see all events.
     * @param eventId
     * @returns ExecutionEventResponse Successful Response
     * @throws ApiError
     */
    public static executionEventsGetExecutionEvent(eventId: string): CancelablePromise<ExecutionEventResponse> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/execution-events/{event_id}",
            path: {
                event_id: eventId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Recent User Events
     * Get recent execution events for a specific user.
     * Users can only see their own events, admins can see all events.
     * @param userId
     * @param limit
     * @returns ExecutionEventResponse Successful Response
     * @throws ApiError
     */
    public static executionEventsGetRecentUserEvents(userId: string, limit: number = 20): CancelablePromise<Array<ExecutionEventResponse>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/execution-events/recent/{user_id}",
            path: {
                user_id: userId,
            },
            query: {
                limit: limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
