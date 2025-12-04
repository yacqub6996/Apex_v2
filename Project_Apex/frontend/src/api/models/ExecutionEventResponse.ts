/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ExecutionEventResponse = {
    id: string;
    event_type: string;
    description: string;
    amount?: number | null;
    user_id?: string | null;
    trader_profile_id?: string | null;
    payload: Record<string, any>;
    created_at: string;
};
