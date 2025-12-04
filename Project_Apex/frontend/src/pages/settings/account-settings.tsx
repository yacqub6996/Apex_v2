import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { Person, Security, NotificationsActive, Settings as SettingsIcon } from "@mui/icons-material";
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { SectionHeader } from '@/components/shared';
import { ProfileSettings } from './profile-settings';
import { SecuritySettings } from './security-settings';
import { NotificationSettings } from './notification-settings';
import { PrivacySettings } from './privacy-settings';

const tabs = [
  { id: 'profile', label: 'Profile', icon: Person },
  { id: 'security', label: 'Security', icon: Security },
  { id: 'notifications', label: 'Notifications', icon: NotificationsActive },
  { id: 'privacy', label: 'Privacy', icon: SettingsIcon }
];

export const AccountSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>
      <Box sx={{ maxWidth: 1024, mx: 'auto' }}>
        <Box sx={{ mb: 4 }}>
          <SectionHeader variant="h4" subtitle="Manage your account preferences and security">
            Account Settings
          </SectionHeader>
        </Box>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          {/* Sidebar Navigation */}
          <Box sx={{ width: { xs: '100%', lg: 256 } }}>
            <Paper
              sx={{
                borderRadius: 2,
                p: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Stack spacing={0.5}>
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    startIcon={<tab.icon sx={{ fontSize: 16 }} />}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: activeTab === tab.id ? 600 : 400,
                      color: activeTab === tab.id ? 'primary.main' : 'text.secondary',
                      bgcolor: activeTab === tab.id ? 'action.selected' : 'transparent',
                      border: activeTab === tab.id ? 1 : 0,
                      borderColor: 'primary.main',
                      '&:hover': {
                        bgcolor: activeTab === tab.id ? 'action.selected' : 'action.hover',
                      },
                    }}
                  >
                    {tab.label}
                  </Button>
                ))}
              </Stack>
            </Paper>

            {/* KYC Status */}
            <Paper
              sx={{
                borderRadius: 2,
                p: 2,
                mt: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
                  <Button
                    size="small"
                    variant="contained"
                    fullWidth
                    href="/kyc"
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Complete Verification
                  </Button>
                )}
              </Stack>
            </Paper>
          </Box>

          {/* Main Content */}
          <Box sx={{ flex: 1 }}>
            {activeTab === 'profile' && <ProfileSettings user={user} />}
            {activeTab === 'security' && <SecuritySettings user={user} />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'privacy' && <PrivacySettings />}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};
