/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminDepositItem } from "./AdminDepositItem";
import type { AdminKycItem } from "./AdminKycItem";
import type { AdminOnlineUser } from "./AdminOnlineUser";
import type { AdminTotals } from "./AdminTotals";

export type AdminDashboardSummary = {
    totals: AdminTotals;
    online_users: Array<AdminOnlineUser>;
    pending_kyc: Array<AdminKycItem>;
    pending_deposits: Array<AdminDepositItem>;
};
