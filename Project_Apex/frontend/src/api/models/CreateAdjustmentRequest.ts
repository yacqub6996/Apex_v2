/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminActionType } from "./AdminActionType";

/**
 * Request to create an admin balance adjustment
 */
export type CreateAdjustmentRequest = {
    user_id: string;
    action_type: AdminActionType;
    amount: number;
    reason: string;
    metadata_payload?: Record<string, any> | null;
};
