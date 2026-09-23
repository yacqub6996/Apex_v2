/**
 * NotificationRow — shared notification list row for desktop popover and
 * mobile sheet (F-07/F-08/F-11/F-13/F-19/F-20).
 *
 * The primary action area and the secondary overflow action are siblings, so
 * the row contains no nested interactive controls.
 */
import { Box, ButtonBase, IconButton, Typography } from "@mui/material";
import { MoreVert } from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import type { NotificationPublic } from "@/api";
import { getNotificationTypeVisual } from "@/components/notifications/notification-taxonomy";

export interface NotificationRowProps {
    notification: NotificationPublic;
    isMobile: boolean;
    onSelect: (notification: NotificationPublic) => void;
    onDeleteRequest: (notification: NotificationPublic) => void;
}

export const NotificationRow = ({
    notification,
    isMobile,
    onSelect,
    onDeleteRequest,
}: NotificationRowProps) => {
    const visual = getNotificationTypeVisual(notification.notification_type);
    const Icon = visual.Icon;
    const absoluteTimestamp = new Date(notification.created_at).toLocaleString();

    return (
        <Box
            data-testid="notification-row"
            sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                px: 2,
                py: 1.5,
                width: "100%",
                minWidth: 0,
                backgroundColor: notification.is_read ? "transparent" : "action.hover",
                "&:hover": {
                    backgroundColor: notification.is_read ? "action.hover" : "action.selected",
                },
                // Secondary action is always visible on mobile and revealed on
                // hover/focus on desktop, where it remains keyboard reachable.
                "& .notification-row-action": {
                    opacity: { xs: 1, sm: 0 },
                    transition: (theme) => theme.transitions.create("opacity", { duration: 150 }),
                },
                "&:hover .notification-row-action, &:focus-within .notification-row-action": {
                    opacity: 1,
                },
            }}
        >
            {/* Leading unread indicator (shape + weight, not color alone). */}
            <Box
                aria-hidden="true"
                sx={{
                    width: 8,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    pt: 0.75,
                }}
            >
                <Box
                    data-testid="notification-unread-dot"
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                        visibility: notification.is_read ? "hidden" : "visible",
                    }}
                />
            </Box>

            <ButtonBase
                component="div"
                onClick={() => onSelect(notification)}
                aria-label={`Open notification: ${notification.title}`}
                sx={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                    py: 0,
                    px: 0,
                    borderRadius: 1,
                }}
            >
                <Box
                    aria-hidden="true"
                    sx={{
                        flexShrink: 0,
                        pt: 0.5,
                        color: `${visual.tone}.main`,
                        display: "flex",
                    }}
                >
                    <Icon fontSize="small" />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="subtitle2"
                        fontWeight={notification.is_read ? 400 : 600}
                        sx={{ overflowWrap: "anywhere" }}
                    >
                        {notification.title}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                    >
                        {notification.message}
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        title={absoluteTimestamp}
                    >
                        {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                        })}
                    </Typography>
                </Box>
            </ButtonBase>

            <IconButton
                className="notification-row-action"
                size="small"
                aria-label={`Actions for ${notification.title}`}
                onClick={(event) => {
                    event.stopPropagation();
                    onDeleteRequest(notification);
                }}
                sx={{ flexShrink: 0, mt: 0.5, visibility: isMobile ? "visible" : undefined }}
            >
                <MoreVert fontSize="small" />
            </IconButton>
        </Box>
    );
};
