/**
 * NotificationCenterContent — shared header/filter/list/footer rendered inside
 * both the desktop popover and the mobile bottom sheet. State and actions come
 * from the single `useNotifications` instance owned by NotificationCenter, so
 * no business logic is duplicated between surfaces.
 */
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Skeleton,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import { Close, DoneAll } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import type { NotificationPublic } from "@/api";
import type { UseNotificationsReturn } from "@/hooks/use-notifications";
import { NotificationRow } from "@/components/notifications/notification-row";
import { useDestructiveConfirmation } from "@/components/ui/confirmation-dialog";
import { resolveNotificationActionUrl } from "@/utils/notification-routes";

export type NotificationFilter = "all" | "unread";

export interface NotificationCenterContentProps {
    isMobile: boolean;
    onClose: () => void;
    filter: NotificationFilter;
    onFilterChange: (filter: NotificationFilter) => void;
    notificationsState: UseNotificationsReturn;
}

const skeletonRows = [0, 1, 2, 3];

export const NotificationCenterContent = ({
    isMobile,
    onClose,
    filter,
    onFilterChange,
    notificationsState,
}: NotificationCenterContentProps) => {
    const navigate = useNavigate();
    const { showDestructiveConfirmation, DestructiveConfirmationDialog } =
        useDestructiveConfirmation();

    const {
        notifications,
        unreadCount,
        unreadCountError,
        unreadCountRefetch,
        isLoading,
        error,
        refetch,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        markAsReadAsync,
        markAllAsRead,
        deleteNotificationAsync,
    } = notificationsState;

    const handleSelect = (notification: NotificationPublic) => {
        const target = resolveNotificationActionUrl(notification.action_url);

        // Close immediately; the read request continues across SPA navigation.
        onClose();

        if (!notification.is_read) {
            // Await the PATCH so the read state reliably persists before we
            // leave. Navigation still proceeds if the PATCH fails: polling and
            // WebSocket reconciliation remain the authoritative fallback.
            void markAsReadAsync(notification.id)
                .catch(() => {
                    // Read-state reconciliation continues via polling/WebSocket.
                })
                .finally(() => {
                    if (target) {
                        void navigate({ to: target.to, search: target.search });
                    }
                });
            return;
        }

        if (target) {
            void navigate({ to: target.to, search: target.search });
        }
    };

    const handleDeleteRequest = (notification: NotificationPublic) => {
        showDestructiveConfirmation(
            "Delete notification",
            `Delete "${notification.title}"? This action cannot be undone.`,
            async () => {
                await deleteNotificationAsync(notification.id);
            },
        );
    };

    const handleSettingsClick = () => {
        onClose();
        void navigate({ to: "/dashboard/settings", search: { tab: "notifications" } });
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                flex: "1 1 auto",
                minHeight: 0,
                maxHeight: "inherit",
                bgcolor: "background.paper",
            }}
        >
            {isMobile && (
                <Box
                    aria-hidden="true"
                    sx={{
                        width: 36,
                        height: 4,
                        bgcolor: "divider",
                        borderRadius: 2,
                        mx: "auto",
                        mt: 1.25,
                        mb: 0.25,
                        flexShrink: 0,
                    }}
                />
            )}

            {/* Header */}
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    flexShrink: 0,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    <Typography
                        id="notification-center-title"
                        variant="h6"
                        component="div"
                        noWrap
                    >
                        Notifications
                    </Typography>
                    {unreadCount > 0 && (
                        <Chip
                            label={`${unreadCount} unread`}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    )}
                </Box>
                {isMobile && (
                    <IconButton
                        aria-label="Close notifications"
                        onClick={onClose}
                        size="small"
                    >
                        <Close fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {/* Actions + filter */}
            <Box
                sx={{
                    px: 2,
                    pb: 1.25,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    flexShrink: 0,
                }}
            >
                <Button
                    size="small"
                    startIcon={<DoneAll />}
                    onClick={() => markAllAsRead()}
                    disabled={unreadCount === 0 || isLoading}
                    sx={{ textTransform: "none" }}
                >
                    Mark all read
                </Button>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={filter}
                    onChange={(_event, value: NotificationFilter | null) => {
                        if (value) onFilterChange(value);
                    }}
                    aria-label="Filter notifications"
                >
                    <ToggleButton value="all" sx={{ textTransform: "none", px: 1.5 }}>
                        All
                    </ToggleButton>
                    <ToggleButton value="unread" sx={{ textTransform: "none", px: 1.5 }}>
                        Unread
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Divider flexItem sx={{ flexShrink: 0 }} />

            {/* Single scrollable list region */}
            <Box
                data-testid="notification-list"
                sx={{
                    flex: "1 1 auto",
                    minHeight: 0,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                }}
            >
                {isLoading ? (
                    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {skeletonRows.map((row) => (
                            <Box key={row} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                                <Skeleton variant="circular" width={20} height={20} />
                                <Box sx={{ flex: 1 }}>
                                    <Skeleton width="40%" height={14} />
                                    <Skeleton width="90%" height={12} />
                                    <Skeleton width="25%" height={10} />
                                </Box>
                            </Box>
                        ))}
                    </Box>
                ) : error ? (
                    <Alert
                        severity="error"
                        sx={{ m: 2, borderRadius: 2 }}
                        action={
                            <Button size="small" color="inherit" onClick={() => void refetch()}>
                                Retry
                            </Button>
                        }
                    >
                        Couldn&apos;t load notifications.
                    </Alert>
                ) : notifications.length === 0 ? (
                    <Box sx={{ py: 5, px: 3, textAlign: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                            {filter === "unread"
                                ? "No unread notifications — you're all caught up"
                                : "No notifications yet"}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {notifications.map((notification) => (
                            <NotificationRow
                                key={notification.id}
                                notification={notification}
                                isMobile={isMobile}
                                onSelect={handleSelect}
                                onDeleteRequest={handleDeleteRequest}
                            />
                        ))}
                        {hasNextPage && (
                            <Box sx={{ py: 1, textAlign: "center" }}>
                                <Button
                                    size="small"
                                    onClick={() => void fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    startIcon={
                                        isFetchingNextPage ? (
                                            <CircularProgress size={14} />
                                        ) : undefined
                                    }
                                    sx={{ textTransform: "none" }}
                                >
                                    Load more
                                </Button>
                            </Box>
                        )}
                    </>
                )}
            </Box>

            {/* Unread-count error state */}
            {unreadCountError && !error && (
                <Alert
                    severity="warning"
                    sx={{ m: 2, borderRadius: 2 }}
                    action={
                        <Button
                            size="small"
                            color="inherit"
                            onClick={() => void unreadCountRefetch()}
                        >
                            Retry
                        </Button>
                    }
                >
                    Couldn&apos;t load the unread count.
                </Alert>
            )}

            {/* Footer */}
            <Box
                sx={{
                    borderTop: 1,
                    borderColor: "divider",
                    px: 2,
                    py: 1.5,
                    pb: { xs: "max(16px, env(safe-area-inset-bottom, 0px))", sm: 1.5 },
                    textAlign: "center",
                    flexShrink: 0,
                }}
            >
                <Button
                    fullWidth
                    size="small"
                    onClick={handleSettingsClick}
                    sx={{ textTransform: "none" }}
                >
                    Notification Settings
                </Button>
            </Box>

            {DestructiveConfirmationDialog}
        </Box>
    );
};
