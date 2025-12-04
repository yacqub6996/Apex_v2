/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NotificationType } from "./NotificationType";

/**
 * Public schema for notification
 */
export type NotificationPublic = {
    title: string;
    message: string;
    notification_type: NotificationType;
    is_read?: boolean;
    related_entity_type?: string | null;
    related_entity_id?: string | null;
    action_url?: string | null;
    id: string;
    user_id: string;
    created_at: string;
    read_at: string | null;
};
