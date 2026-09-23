/**
 * Notification taxonomy (F-20).
 *
 * Canonical visual mapping for every NotificationType in the generated API
 * enum (`src/api/models/NotificationType.ts`). Icons are decorative and always
 * paired with the notification title/text — color/icon is never the sole
 * carrier of meaning (WCAG 1.4.1).
 */
import type { SvgIconComponent } from "@mui/icons-material";
import {
    AccountBalance,
    CallMade,
    Campaign,
    Cancel,
    CheckCircle,
    ContentCopy,
    Error,
    Gavel,
    GppBad,
    GroupAdd,
    HourglassEmpty,
    Info,
    ManageAccounts,
    Paid,
    PauseCircle,
    PlayCircle,
    ReceiptLong,
    Security,
    SouthWest,
    StopCircle,
    SwapHoriz,
    TimerOff,
    TrendingDown,
    Tune,
    VerifiedUser,
} from "@mui/icons-material";
import { NotificationType } from "@/api";

export type NotificationTone = "success" | "error" | "warning" | "info";

export interface NotificationTypeVisual {
    /** Decorative icon component (rendered aria-hidden). */
    Icon: SvgIconComponent;
    /** MUI icon color token. */
    tone: NotificationTone;
    /** Human-readable category label (tests, tooltips, screen-reader context). */
    label: string;
}

const DEFAULT_VISUAL: NotificationTypeVisual = {
    Icon: Info,
    tone: "info",
    label: "Notification",
};

/** Canonical mapping covering every value in the generated NotificationType enum. */
export const NOTIFICATION_TYPE_VISUALS: Record<string, NotificationTypeVisual> = {
    [NotificationType.KYC_SUBMITTED]: { Icon: Info, tone: "info", label: "KYC submitted" },
    [NotificationType.KYC_APPROVED]: { Icon: VerifiedUser, tone: "success", label: "KYC approved" },
    [NotificationType.KYC_REJECTED]: { Icon: GppBad, tone: "error", label: "KYC rejected" },
    [NotificationType.WITHDRAWAL_APPROVED]: {
        Icon: CheckCircle,
        tone: "success",
        label: "Withdrawal approved",
    },
    [NotificationType.WITHDRAWAL_REJECTED]: {
        Icon: Error,
        tone: "error",
        label: "Withdrawal rejected",
    },
    [NotificationType.DEPOSIT_CONFIRMED]: {
        Icon: SouthWest,
        tone: "success",
        label: "Deposit confirmed",
    },
    [NotificationType.ROI_RECEIVED]: { Icon: Paid, tone: "success", label: "ROI received" },
    [NotificationType.COPY_TRADE_EXECUTED]: {
        Icon: ContentCopy,
        tone: "info",
        label: "Copy trade executed",
    },
    [NotificationType.COPY_RELATIONSHIP_STARTED]: {
        Icon: GroupAdd,
        tone: "success",
        label: "Copy trading started",
    },
    [NotificationType.COPY_RELATIONSHIP_PAUSED]: {
        Icon: PauseCircle,
        tone: "warning",
        label: "Copy relationship paused",
    },
    [NotificationType.COPY_RELATIONSHIP_RESUMED]: {
        Icon: PlayCircle,
        tone: "success",
        label: "Copy relationship resumed",
    },
    [NotificationType.COPY_RELATIONSHIP_STOPPED]: {
        Icon: StopCircle,
        tone: "warning",
        label: "Copy relationship stopped",
    },
    [NotificationType.COMMISSION_CONFIRMED]: {
        Icon: ReceiptLong,
        tone: "success",
        label: "Commission confirmed",
    },
    [NotificationType.DEPOSIT_PENDING]: {
        Icon: HourglassEmpty,
        tone: "info",
        label: "Deposit pending",
    },
    [NotificationType.DEPOSIT_FAILED]: { Icon: Error, tone: "error", label: "Deposit failed" },
    [NotificationType.DEPOSIT_EXPIRED]: {
        Icon: TimerOff,
        tone: "warning",
        label: "Deposit expired",
    },
    [NotificationType.WITHDRAWAL_REQUESTED]: {
        Icon: CallMade,
        tone: "info",
        label: "Withdrawal requested",
    },
    [NotificationType.WITHDRAWAL_CANCELLED]: {
        Icon: Cancel,
        tone: "warning",
        label: "Withdrawal cancelled",
    },
    [NotificationType.WITHDRAWAL_FAILED]: {
        Icon: Error,
        tone: "error",
        label: "Withdrawal failed",
    },
    [NotificationType.WITHDRAWAL_DELIVERED]: {
        Icon: CheckCircle,
        tone: "success",
        label: "Withdrawal delivered",
    },
    [NotificationType.WALLET_TRANSFER_COMPLETED]: {
        Icon: SwapHoriz,
        tone: "info",
        label: "Wallet transfer completed",
    },
    [NotificationType.ADMIN_ADJUSTMENT]: {
        Icon: Tune,
        tone: "info",
        label: "Admin adjustment",
    },
    [NotificationType.CHARGEBACK_UPDATE]: {
        Icon: Gavel,
        tone: "warning",
        label: "Chargeback update",
    },
    [NotificationType.TRADER_STATUS_CHANGED]: {
        Icon: ManageAccounts,
        tone: "info",
        label: "Trader status changed",
    },
    [NotificationType.COPY_DRAWDOWN_ALERT]: {
        Icon: TrendingDown,
        tone: "error",
        label: "Copy drawdown alert",
    },
    [NotificationType.PLATFORM_INCIDENT]: {
        Icon: Campaign,
        tone: "warning",
        label: "Platform incident",
    },
    [NotificationType.INVESTMENT_MATURED]: {
        Icon: AccountBalance,
        tone: "success",
        label: "Investment matured",
    },
    [NotificationType.SECURITY_ALERT]: {
        Icon: Security,
        tone: "warning",
        label: "Security alert",
    },
    [NotificationType.SYSTEM_ANNOUNCEMENT]: {
        Icon: Campaign,
        tone: "info",
        label: "System announcement",
    },
};

/**
 * Resolve the visual treatment for a notification type string. Unknown or
 * missing types fall back to the generic Info treatment (genuinely generic
 * types only — the canonical enum is fully mapped above).
 */
export function getNotificationTypeVisual(
    type: string | null | undefined,
): NotificationTypeVisual {
    if (!type) return DEFAULT_VISUAL;
    return NOTIFICATION_TYPE_VISUALS[type] ?? DEFAULT_VISUAL;
}
