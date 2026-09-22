import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { Panel } from '@/components/shared';
import {
  NotificationsService,
  type UserNotificationPreferencesPublic,
  type UserNotificationPreferencesUpdate,
} from '@/api';
import { browserNotificationService } from '@/services/browser-notification-service';

type PrefKey = keyof UserNotificationPreferencesUpdate;

const PREFERENCES_QUERY_KEY = ['notification-preferences'];

interface NotificationCategory {
  title: string;
  description: string;
  key: PrefKey;
  category: string;
  disabled?: boolean;
}

const notificationCategories: NotificationCategory[] = [
  {
    title: 'Email Notifications',
    description:
      'Master switch for optional notification emails. Security-critical and account-protection emails are always delivered regardless of this setting.',
    key: 'email_notifications',
    category: 'Communication',
  },
  {
    title: 'Browser Notifications',
    description:
      'Show notifications in this browser when permission is granted. Disabling this stops browser notifications even if the browser has granted permission.',
    key: 'browser_notifications',
    category: 'Communication',
  },
  {
    title: 'Copy Trading Alerts',
    description:
      'Email alerts when copied traders execute trades or when your copy relationships start, pause, resume, or stop.',
    key: 'copy_trading_alerts',
    category: 'Trading',
  },
  {
    title: 'Withdrawal Alerts',
    description:
      'Email alerts when withdrawal requests are requested, processed, cancelled, failed, or delivered.',
    key: 'withdrawal_alerts',
    category: 'Account',
  },
  {
    title: 'Market Updates',
    description:
      'Email market digests, allocation-drift alerts, and engagement updates. This is opt-in and off by default.',
    key: 'market_updates',
    category: 'Trading',
  },
  {
    title: 'Security Alerts',
    description:
      'Critical security and account-protection notifications are always delivered by email and in-app and cannot be disabled.',
    key: 'security_alerts',
    category: 'Security',
    disabled: true,
  },
];

const groupedNotifications = notificationCategories.reduce((acc, item) => {
  if (!acc[item.category]) {
    acc[item.category] = [];
  }
  acc[item.category].push(item);
  return acc;
}, {} as Record<string, NotificationCategory[]>);

export const NotificationSettings = () => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<UserNotificationPreferencesUpdate>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [browserSupported, setBrowserSupported] = useState(true);

  const preferencesQuery = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: () => NotificationsService.notificationsGetPreferences(),
  });

  const serverPreferences = preferencesQuery.data;

  // Synchronize the local draft with the persisted server state once loaded.
  useEffect(() => {
    if (serverPreferences) {
      setDraft({
        email_notifications: serverPreferences.email_notifications,
        browser_notifications: serverPreferences.browser_notifications,
        copy_trading_alerts: serverPreferences.copy_trading_alerts,
        withdrawal_alerts: serverPreferences.withdrawal_alerts,
        market_updates: serverPreferences.market_updates,
        security_alerts: serverPreferences.security_alerts,
      });
    }
  }, [serverPreferences]);

  useEffect(() => {
    setBrowserSupported(browserNotificationService.isSupported());
    if (browserNotificationService.isSupported()) {
      setBrowserPermission(browserNotificationService.getPermissionStatus());
    }
  }, []);

  const saveMutation = useMutation({
    mutationFn: (payload: UserNotificationPreferencesUpdate) =>
      NotificationsService.notificationsUpdatePreferences(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, saved);
      setDraft({
        email_notifications: saved.email_notifications,
        browser_notifications: saved.browser_notifications,
        copy_trading_alerts: saved.copy_trading_alerts,
        withdrawal_alerts: saved.withdrawal_alerts,
        market_updates: saved.market_updates,
        security_alerts: saved.security_alerts,
      });
      setSaveSuccess(true);
      setSaveError(null);
    },
    onError: (error: Error) => {
      setSaveError(
        error?.message || 'Failed to save notification preferences. Please try again.'
      );
      setSaveSuccess(false);
    },
  });

  const draftValue = (key: PrefKey): boolean =>
    draft[key] !== undefined
      ? Boolean(draft[key])
      : Boolean(serverPreferences?.[key as keyof UserNotificationPreferencesPublic]);

  const hasChanges =
    serverPreferences !== undefined &&
    Object.keys(notificationCategories).length > 0 &&
    notificationCategories.some((item) => {
      if (item.disabled) return false;
      return draftValue(item.key) !== Boolean(
        serverPreferences[item.key as keyof UserNotificationPreferencesPublic]
      );
    });

  const handleToggle = async (key: PrefKey, value: boolean) => {
    // Request browser permission before enabling browser notifications.
    if (key === 'browser_notifications' && value && browserSupported) {
      const permission = await browserNotificationService.requestPermission();
      setBrowserPermission(permission);
      if (permission !== 'granted') {
        return;
      }
    }

    setSaveSuccess(false);
    setSaveError(null);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setSaveSuccess(false);
    setSaveError(null);
    saveMutation.mutate(draft);
  };

  const renderItem = (item: NotificationCategory) => {
    const enabled = item.key === 'security_alerts' ? true : draftValue(item.key);
    return (
      <Box
        key={item.key}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          p: 3,
          border: 'none',
          boxShadow: '0px 1px 3px rgba(0,0,0,0.04)',
          borderRadius: 2,
          bgcolor: 'background.paper',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
            {item.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item.description}
          </Typography>
        </Box>
        <Box sx={{ ml: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => handleToggle(item.key, e.target.checked)}
                color="primary"
                disabled={item.disabled || saveMutation.isPending}
                aria-label={`${item.title} toggle`}
              />
            }
            label=""
          />
        </Box>
      </Box>
    );
  };

  return (
    <Panel
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsIcon />
          <Typography variant="h5" component="span">Notification Settings</Typography>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {preferencesQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : preferencesQuery.isError ? (
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={() => preferencesQuery.refetch()}>
                Retry
              </Button>
            }
          >
            Failed to load notification preferences. Please try again.
          </Alert>
        ) : (
          <>
            {saveSuccess && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveSuccess(false)}>
                Notification preferences updated successfully!
              </Alert>
            )}

            {saveError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
                {saveError}
              </Alert>
            )}

            {!browserSupported && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Browser notifications are not supported in your current browser.
              </Alert>
            )}

            {browserSupported &&
              browserPermission === 'denied' &&
              draftValue('browser_notifications') && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Browser notifications are blocked. Please enable them in your browser settings
                  to receive push notifications.
                </Alert>
              )}

            {Object.entries(groupedNotifications).map(([category, items]) => (
              <Box key={category}>
                <Typography
                  variant="h5"
                  component="h3"
                  sx={{
                    mb: 2,
                    fontWeight: 600,
                    color: 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {category}
                  <Chip
                    label={`${items.length} setting${items.length !== 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                  />
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {items.map(renderItem)}
                </Box>

                {category !==
                  Object.keys(groupedNotifications)[
                    Object.keys(groupedNotifications).length - 1
                  ] && <Divider sx={{ my: 3 }} />}
              </Box>
            ))}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                onClick={handleSave}
                variant="contained"
                disabled={!hasChanges || saveMutation.isPending}
                startIcon={saveMutation.isPending ? <CircularProgress size={16} /> : null}
                sx={{
                  minWidth: 140,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </Box>
          </>
        )}

        <Alert
          severity="info"
          sx={{
            borderRadius: 2,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            📱 Notification Preview
          </Typography>
          <Typography variant="body2">
            You'll receive notifications based on your selected preferences. Critical security
            alerts are always enabled and cannot be turned off.
          </Typography>
        </Alert>
      </Box>
    </Panel>
  );
};
