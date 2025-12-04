import { useState, Suspense, lazy } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/base/buttons/button';
import { Person, Security, NotificationsActive, Settings } from "@mui/icons-material";
import { Chip, Box, Typography, Stack, Card, CardContent } from '@mui/material';
import { TabList, Tab } from '@/components/application/tabs/tabs';
import { SettingsTabSkeleton } from '@/components/ui/loading-skeleton';

// Lazy load settings components with proper typing
const ProfileSettings = lazy(() => import('@/pages/settings/profile-settings').then(module => ({ default: module.ProfileSettings })));
const SecuritySettings = lazy(() => import('@/pages/settings/security-settings').then(module => ({ default: module.SecuritySettings })));
const NotificationSettings = lazy(() => import('@/pages/settings/notification-settings').then(module => ({ default: module.NotificationSettings })));
const PrivacySettings = lazy(() => import('@/pages/settings/privacy-settings').then(module => ({ default: module.PrivacySettings })));

const tabs = [
  { id: 'profile', label: 'Profile', icon: Person },
  { id: 'security', label: 'Security', icon: Security },
  { id: 'notifications', label: 'Notifications', icon: NotificationsActive },
  { id: 'privacy', label: 'Privacy', icon: Settings }
];

export const DashboardSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <Suspense fallback={<SettingsTabSkeleton />}>
            <ProfileSettings user={user} />
          </Suspense>
        );
      case 1:
        return (
          <Suspense fallback={<SettingsTabSkeleton />}>
            <SecuritySettings user={user} />
          </Suspense>
        );
      case 2:
        return (
          <Suspense fallback={<SettingsTabSkeleton />}>
            <NotificationSettings />
          </Suspense>
        );
      case 3:
        return (
          <Suspense fallback={<SettingsTabSkeleton />}>
            <PrivacySettings />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<SettingsTabSkeleton />}>
            <ProfileSettings user={user} />
          </Suspense>
        );
    }
  };

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', width: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Account Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account preferences and security
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
        {/* Sidebar Navigation */}
        <Box sx={{ width: { lg: 280 }, flexShrink: 0 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <TabList 
                orientation="vertical" 
                customVariant="button-brand"
                value={activeTab}
                onChange={handleTabChange}
                sx={{ width: '100%' }}
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Tab
                      key={tab.id}
                      label={tab.label}
                      icon={<Icon sx={{ fontSize: 16 }} />}
                      iconPosition="start"
                      customVariant="button-brand"
                      sx={{ 
                        justifyContent: 'flex-start',
                        mb: 0.5,
                        width: '100%'
                      }}
                    />
                  );
                })}
              </TabList>
            </CardContent>
          </Card>

          {/* KYC Status */}
          <Card variant="outlined" sx={{ borderRadius: 2, mt: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={600}>
                    KYC Status
                  </Typography>
                  <Chip
                    label={user?.kyc_status?.toLowerCase()}
                    color={
                      user?.kyc_status === 'APPROVED' ? 'success' :
                      (user?.kyc_status === 'PENDING' || user?.kyc_status === 'UNDER_REVIEW') ? 'warning' : 'error'
                    }
                    size="small"
                  />
                </Box>
                {user?.kyc_status !== 'APPROVED' && (
                  <Button size="sm" className="w-full" href="/kyc">
                    Complete Verification
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card variant="outlined" sx={{ borderRadius: 2, mt: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Typography variant="body2" fontWeight={600}>
                  Quick Actions
                </Typography>
                <Button size="sm" className="w-full" href="/dashboard/account">
                  Manage Account
                </Button>
                <Button size="sm" className="w-full" color="secondary" href="/plans">
                  View Plans
                </Button>
                <Button size="sm" className="w-full" color="secondary" href="/dashboard/copy-trading">
                  Copy Trading
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {renderTabContent()}
        </Box>
      </Stack>
    </Box>
  );
};