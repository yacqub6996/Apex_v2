/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
import type { NotificationPublic } from "../models/NotificationPublic";
import type { NotificationUpdate } from "../models/NotificationUpdate";
import type { NotificationsPublic } from "../models/NotificationsPublic";
import type { UserNotificationPreferencesPublic } from "../models/UserNotificationPreferencesPublic";
import type { UserNotificationPreferencesUpdate } from "../models/UserNotificationPreferencesUpdate";

export class NotificationsService {
    /**
     * Get Notifications
     * Get current user's notifications (newest first, safely paginated).
     *
     * - **unread_only**: If True, only return unread notifications
     * - **limit**: Maximum number of notifications to return (default: 50, max: 100)
     * - **offset**: Number of notifications to skip (default: 0)
     * @param unreadOnly
     * @param limit
     * @param offset
     * @returns NotificationsPublic Successful Response
     * @throws ApiError
     */
    public static notificationsGetNotifications(unreadOnly: boolean = false, limit: number = 50, offset: number = 0): CancelablePromise<NotificationsPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/notifications/",
            query: {
                unread_only: unreadOnly,
                limit: limit,
                offset: offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Unread Count
     * Get count of unread notifications for current user.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static notificationsGetUnreadCount(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/notifications/unread-count",
        });
    }
    /**
     * Update Notification
     * Update a notification (mark as read/unread).
     * @param notificationId
     * @param requestBody
     * @returns NotificationPublic Successful Response
     * @throws ApiError
     */
    public static notificationsUpdateNotification(notificationId: string, requestBody: NotificationUpdate): CancelablePromise<NotificationPublic> {
        return __request(OpenAPI, {
            method: "PATCH",
            url: "/api/v1/notifications/{notification_id}",
            path: {
                notification_id: notificationId,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Notification
     * Delete a notification.
     * @param notificationId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static notificationsDeleteNotification(notificationId: string): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: "DELETE",
            url: "/api/v1/notifications/{notification_id}",
            path: {
                notification_id: notificationId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Mark All Read
     * Mark all notifications as read for current user.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static notificationsMarkAllRead(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: "POST",
            url: "/api/v1/notifications/mark-all-read",
        });
    }
    /**
     * Get Notification Preferences
     * Get the current user's persisted notification preferences.
     * @returns UserNotificationPreferencesPublic Successful Response
     * @throws ApiError
     */
    public static notificationsGetPreferences(): CancelablePromise<UserNotificationPreferencesPublic> {
        return __request(OpenAPI, {
            method: "GET",
            url: "/api/v1/notifications/preferences",
        });
    }
    /**
     * Update Notification Preferences
     * Update the current user's persisted notification preferences.
     * @param requestBody
     * @returns UserNotificationPreferencesPublic Successful Response
     * @throws ApiError
     */
    public static notificationsUpdatePreferences(
        requestBody: UserNotificationPreferencesUpdate,
    ): CancelablePromise<UserNotificationPreferencesPublic> {
        return __request(OpenAPI, {
            method: "PUT",
            url: "/api/v1/notifications/preferences",
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
