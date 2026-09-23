import { useState } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
  Button,
  CircularProgress,
  Chip,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle,
  Error,
  Info,
  Warning,
  Delete,
  DoneAll,
} from '@mui/icons-material';
import { useNotifications } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationPublic } from '@/api';
import { useNavigate } from '@tanstack/react-router';
import { resolveNotificationActionUrl } from '@/utils/notification-routes';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'KYC_APPROVED':
    case 'WITHDRAWAL_APPROVED':
    case 'DEPOSIT_CONFIRMED':
    case 'ROI_RECEIVED':
    case 'INVESTMENT_MATURED':
      return <CheckCircle color="success" />;
    case 'KYC_REJECTED':
    case 'WITHDRAWAL_REJECTED':
      return <Error color="error" />;
    case 'SECURITY_ALERT':
      return <Warning color="warning" />;
    default:
      return <Info color="info" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'KYC_APPROVED':
    case 'WITHDRAWAL_APPROVED':
    case 'DEPOSIT_CONFIRMED':
    case 'ROI_RECEIVED':
    case 'INVESTMENT_MATURED':
      return 'success';
    case 'KYC_REJECTED':
    case 'WITHDRAWAL_REJECTED':
      return 'error';
    case 'SECURITY_ALERT':
      return 'warning';
    default:
      return 'info';
  }
};

export const NotificationCenter = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsReadAsync,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({
    unreadOnly: false,
    limit: 20,
    enablePolling: true,
  });

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: NotificationPublic) => {
    const target = resolveNotificationActionUrl(notification.action_url);

    // Close the menu immediately so the UI responds before the read request
    // completes; the read mutation continues across SPA navigation.
    handleClose();

    if (!notification.is_read) {
      // Await the PATCH so the read state reliably persists before we leave
      // the current route. Navigation still proceeds if the PATCH fails:
      // polling/WebSocket reconciliation remains the authoritative fallback.
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

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleDeleteNotification = (
    event: React.MouseEvent,
    notificationId: string
  ) => {
    event.stopPropagation();
    deleteNotification(notificationId);
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="large"
        aria-label={`${unreadCount} unread notifications`}
        aria-controls={open ? 'notification-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{ color: 'text.primary' }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: { xs: '92vw', sm: 400 },
            maxHeight: '70vh',
            mt: 1.5,
            mx: { xs: 1, sm: 0 },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" component="div">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAll />}
              onClick={handleMarkAllRead}
              sx={{ textTransform: 'none' }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        <Divider />

        {/* Notification List */}
        <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
          {isLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 4,
              }}
            >
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  py: 1.5,
                  px: 2,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  backgroundColor: notification.is_read
                    ? 'transparent'
                    : 'action.hover',
                  '&:hover': {
                    backgroundColor: notification.is_read
                      ? 'action.hover'
                      : 'action.selected',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 'auto', mt: 0.5 }}>
                  {getNotificationIcon(notification.notification_type)}
                </ListItemIcon>

                <ListItemText
                  sx={{ flex: 1 }}
                  primary={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: notification.is_read ? 400 : 600,
                          flex: 1,
                        }}
                      >
                        {notification.title}
                      </Typography>
                      {!notification.is_read && (
                        <Chip
                          label="New"
                          size="small"
                          color={getNotificationColor(notification.notification_type) as any}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </Typography>
                    </>
                  }
                />

                <IconButton
                  size="small"
                  onClick={(e) =>
                    handleDeleteNotification(e, notification.id)
                  }
                  sx={{ mt: 0.5 }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </MenuItem>
            ))
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  handleClose();
                  void navigate({ to: '/dashboard/settings', search: { tab: 'notifications' } });
                }}
                sx={{ textTransform: 'none' }}
              >
                Notification Settings
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};
