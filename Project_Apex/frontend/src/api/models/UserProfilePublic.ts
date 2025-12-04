/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InvestmentStrategy } from "./InvestmentStrategy";

export type UserProfilePublic = {
    legal_first_name?: string | null;
    legal_last_name?: string | null;
    date_of_birth?: string | null;
    phone_number?: string | null;
    address_line_1?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
    tax_id_number?: string | null;
    occupation?: string | null;
    source_of_funds?: string | null;
    investment_strategy?: InvestmentStrategy;
    id: string;
    user_id: string;
    risk_assessment_score: number;
    created_at: string;
    updated_at: string;
};
