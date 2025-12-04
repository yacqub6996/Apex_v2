import { useState, useEffect } from 'react';
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
import { browserNotificationService } from '@/services/browser-notification-service';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  copyTradingAlerts: boolean;
  withdrawalAlerts: boolean;
  marketUpdates: boolean;
  securityAlerts: boolean;
}

interface NotificationCategory {
  title: string;
  description: string;
  key: keyof NotificationSettings;
  category: string;
}

export const NotificationSettings = () => {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: false,
    copyTradingAlerts: true,
    withdrawalAlerts: true,
    marketUpdates: false,
    securityAlerts: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [browserSupported, setBrowserSupported] = useState(true);

  useEffect(() => {
    // Check browser notification support and permission
    setBrowserSupported(browserNotificationService.isSupported());
    if (browserNotificationService.isSupported()) {
      setBrowserPermission(browserNotificationService.getPermissionStatus());
    }
  }, []);

  const notificationCategories: NotificationCategory[] = [
    {
      title: 'Email Notifications',
      description: 'Receive updates via email',
      key: 'emailNotifications',
      category: 'Communication'
    },
    {
      title: 'Push Notifications',
      description: 'Browser and mobile push notifications',
      key: 'pushNotifications',
      category: 'Communication'
    },
    {
      title: 'Copy Trading Alerts',
      description: 'When traders you follow execute trades',
      key: 'copyTradingAlerts',
      category: 'Trading'
    },
    {
      title: 'Withdrawal Alerts',
      description: 'When withdrawal requests are processed',
      key: 'withdrawalAlerts',
      category: 'Account'
    },
    {
      title: 'Market Updates',
      description: 'Daily market analysis and insights',
      key: 'marketUpdates',
      category: 'Trading'
    },
    {
      title: 'Security Alerts',
      description: 'Important security notifications',
      key: 'securityAlerts',
      category: 'Security'
    }
  ];

  const groupedNotifications = notificationCategories.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NotificationCategory[]>);

  const updateNotification = async (key: keyof NotificationSettings, value: boolean) => {
    // If enabling push notifications, request browser permission first
    if (key === 'pushNotifications' && value && browserSupported) {
      const permission = await browserNotificationService.requestPermission();
      setBrowserPermission(permission);
      
      if (permission !== 'granted') {
        // Don't enable push notifications if permission was denied
        return;
      }
    }

    setNotifications(prev => ({ ...prev, [key]: value }));
    
    // Clear success message when settings change
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveSuccess(false);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // TODO: Implement notification preferences update
      console.log('Saving notification preferences:', notifications);
      
      setSaveSuccess(true);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const NotificationItem = ({
    title,
    description,
    settingKey,
    enabled
  }: {
    title: string;
    description: string;
    settingKey: keyof NotificationSettings;
    enabled: boolean;
  }) => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        p: 3,
        border: "none",
        boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
        borderRadius: 2,
        bgcolor: 'background.paper',
        '&:hover': {
          bgcolor: 'action.hover',
        }
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Box sx={{ ml: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => updateNotification(settingKey, e.target.checked)}
              color="primary"
            />
          }
          label=""
        />
      </Box>
    </Box>
  );

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
        {saveSuccess && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSaveSuccess(false)}
          >
            Notification preferences updated successfully!
          </Alert>
        )}

        {!browserSupported && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Browser notifications are not supported in your current browser.
          </Alert>
        )}

        {browserSupported && browserPermission === 'denied' && notifications.pushNotifications && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Browser notifications are blocked. Please enable them in your browser settings to receive push notifications.
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
                  gap: 1
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
                {items.map((item) => (
                  <NotificationItem
                    key={item.key}
                    title={item.title}
                    description={item.description}
                    settingKey={item.key}
                    enabled={notifications[item.key]}
                  />
                ))}
              </Box>
              
              {category !== Object.keys(groupedNotifications)[Object.keys(groupedNotifications).length - 1] && (
                <Divider sx={{ my: 3 }} />
              )}
            </Box>
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={16} /> : null}
              sx={{
                minWidth: 140,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {isLoading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </Box>

          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              📱 Notification Preview
            </Typography>
            <Typography variant="body2">
              You'll receive notifications based on your selected preferences.
              Security alerts are always enabled for critical updates.
            </Typography>
          </Alert>
        </Box>
      </Panel>
    );
};
