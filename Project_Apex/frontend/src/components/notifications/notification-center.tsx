/**
 * NotificationCenter — responsive notification bell + surface orchestrator.
 *
 * - Desktop/tablet (sm+): compact anchored MUI Menu popover (retained).
 * - Mobile (xs): bottom-anchored MUI Drawer sheet with scrim.
 *
 * Both surfaces render the same NotificationCenterContent and share a single
 * `useNotifications` instance so no business logic is duplicated (F-07/F-08).
 */
import { useState } from "react";
import { Badge, IconButton, Menu, useMediaQuery, useTheme } from "@mui/material";
import { Notifications as NotificationsIcon } from "@mui/icons-material";
import { useNotifications } from "@/hooks/use-notifications";
import {
    NotificationCenterContent,
    type NotificationFilter,
} from "@/components/notifications/notification-center-content";
import { MobileNotificationSheet } from "@/components/notifications/mobile-notification-sheet";

export const NotificationCenter = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [filter, setFilter] = useState<NotificationFilter>("all");

    const notificationsState = useNotifications({
        unreadOnly: filter === "unread",
        limit: 20,
        enablePolling: true,
    });

    const desktopOpen = Boolean(anchorEl);
    const surfaceOpen = isMobile ? mobileOpen : desktopOpen;

    const handleBellClick = (event: React.MouseEvent<HTMLElement>) => {
        if (isMobile) {
            setMobileOpen(true);
            return;
        }
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setMobileOpen(false);
    };

    const handleFilterChange = (nextFilter: NotificationFilter) => {
        setFilter(nextFilter);
    };

    const surfaceId = isMobile ? "notification-mobile-sheet" : "notification-menu";

    return (
        <>
            <IconButton
                onClick={handleBellClick}
                size="large"
                aria-label={`${notificationsState.unreadCount} unread notifications`}
                aria-controls={surfaceId}
                aria-haspopup={isMobile ? "dialog" : "true"}
                aria-expanded={surfaceOpen ? "true" : "false"}
                sx={{ color: "text.primary" }}
            >
                <Badge badgeContent={notificationsState.unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>

            <Menu
                id="notification-menu"
                anchorEl={anchorEl}
                open={desktopOpen}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        width: 400,
                        maxWidth: "calc(100vw - 32px)",
                        maxHeight: "min(560px, calc(100vh - 96px))",
                        mt: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    },
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
                <NotificationCenterContent
                    isMobile={false}
                    onClose={handleClose}
                    filter={filter}
                    onFilterChange={handleFilterChange}
                    notificationsState={notificationsState}
                />
            </Menu>

            <MobileNotificationSheet open={mobileOpen} onClose={handleClose}>
                <NotificationCenterContent
                    isMobile
                    onClose={handleClose}
                    filter={filter}
                    onFilterChange={handleFilterChange}
                    notificationsState={notificationsState}
                />
            </MobileNotificationSheet>
        </>
    );
};
