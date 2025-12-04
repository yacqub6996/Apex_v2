/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExecutionFeedEvent } from "./ExecutionFeedEvent";

export type ExecutionFeedResponse = {
    data: Array<ExecutionFeedEvent>;
    count: number;
    latest_cursor?: string | null;
    readonly latestCursor: string | null;
};
