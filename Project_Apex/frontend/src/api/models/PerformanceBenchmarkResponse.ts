/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PerformanceBenchmarkResponse = {
    strategy: string;
    actual_annual_roi: number;
    target_annual_roi: number;
    performance_gap: number;
    performance_percentage: number;
    is_meeting_benchmark: boolean;
    benchmarks: Record<string, number>;
};
