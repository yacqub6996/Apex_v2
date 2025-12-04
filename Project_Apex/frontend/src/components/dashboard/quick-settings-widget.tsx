import { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Switch,
  FormControlLabel,
  Chip,
  Button,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  VerifiedUser as VerifiedUserIcon,
  Settings as SettingsIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/providers/auth-provider';

interface QuickSettingsWidgetProps {
  compact?: boolean;
}

export const QuickSettingsWidget = ({ compact = false }: QuickSettingsWidgetProps) => {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleNotificationToggle = async (enabled: boolean) => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setNotificationsEnabled(enabled);
      setSaveSuccess(true);
      
      // Auto-hide success message
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getKycStatusConfig = () => {
    const status = user?.kyc_status;
    switch (status) {
      case 'APPROVED':
        return {
          color: 'success' as const,
          icon: <CheckCircleIcon fontSize="small" />,
          label: 'Verified',
          description: 'Your identity is verified'
        };
      case 'PENDING':
      case 'UNDER_REVIEW':
        return {
          color: 'warning' as const,
          icon: <WarningIcon fontSize="small" />,
          label: 'In Review',
          description: 'Verification in progress'
        };
      default:
        return {
          color: 'error' as const,
          icon: <ErrorIcon fontSize="small" />,
          label: 'Required',
          description: 'Complete KYC verification'
        };
    }
  };

  const kycConfig = getKycStatusConfig();

  const getSecurityStatus = () => {
    // Mock security assessment
    const has2FA = false; // Would come from user data
    const hasStrongPassword = true; // Would come from user data
    
    if (has2FA && hasStrongPassword) {
      return { level: 'high', label: 'Strong', color: 'success' as const };
    } else if (hasStrongPassword) {
      return { level: 'medium', label: 'Good', color: 'warning' as const };
    } else {
      return { level: 'low', label: 'Basic', color: 'error' as const };
    }
  };

  const securityStatus = getSecurityStatus();

  if (compact) {
    return (
      <Card 
        variant="outlined" 
        sx={{ 
          borderRadius: 2,
          backgroundColor: 'background.paper',
          borderColor: 'divider'
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={2}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SettingsIcon fontSize="small" />
                Quick Settings
              </Typography>
              <Tooltip title="View all settings">
                <IconButton 
                  size="small" 
                  component={Link}
                  to="/dashboard/settings"
                  sx={{ 
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' }
                  }}
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* KYC Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerifiedUserIcon fontSize="small" color="primary" />
                <Typography variant="body2" color="text.secondary">
                  KYC
                </Typography>
              </Box>
              <Chip
                label={kycConfig.label}
                size="small"
                color={kycConfig.color}
                icon={kycConfig.icon}
                variant="outlined"
              />
            </Box>

            {/* Notifications */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsIcon fontSize="small" color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Notifications
                </Typography>
              </Box>
              <Switch
                size="small"
                checked={notificationsEnabled}
                onChange={(e) => handleNotificationToggle(e.target.checked)}
                disabled={isSaving}
              />
            </Box>

            {/* Security */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon fontSize="small" color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Security
                </Typography>
              </Box>
              <Chip
                label={securityStatus.label}
                size="small"
                color={securityStatus.color}
                variant="outlined"
              />
            </Box>

            {/* View All Settings */}
            <Button
              component={Link}
              to="/dashboard/settings"
              variant="outlined"
              size="small"
              fullWidth
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              View All Settings
            </Button>

            {/* Save Status */}
            {saveSuccess && (
              <Alert 
                severity="success" 
                sx={{ 
                  py: 0.5,
                  '& .MuiAlert-message': { 
                    padding: '2px 0',
                    fontSize: '0.75rem'
                  }
                }}
              >
                Settings updated
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        borderRadius: 2,
        backgroundColor: 'background.paper',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon />
              Quick Settings
            </Typography>
            <Tooltip title="View all settings">
              <IconButton 
                component={Link}
                to="/dashboard/settings"
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <OpenInNewIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* KYC Status */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerifiedUserIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  KYC Status
                </Typography>
              </Box>
              <Chip
                label={kycConfig.label}
                color={kycConfig.color}
                icon={kycConfig.icon}
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {kycConfig.description}
            </Typography>
            {user?.kyc_status !== 'APPROVED' && (
              <Button
                component={Link}
                to="/kyc"
                variant="contained"
                size="small"
                fullWidth
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Complete Verification
              </Button>
            )}
          </Box>

          {/* Notifications */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Notifications
                </Typography>
              </Box>
              {isSaving ? (
                <CircularProgress size={20} />
              ) : (
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationsEnabled}
                      onChange={(e) => handleNotificationToggle(e.target.checked)}
                      color="primary"
                    />
                  }
                  label=""
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Receive important updates and alerts
            </Typography>
          </Box>

          {/* Security Status */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Security
                </Typography>
              </Box>
              <Chip
                label={securityStatus.label}
                color={securityStatus.color}
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {securityStatus.level === 'high' 
                ? 'Your account security is strong'
                : securityStatus.level === 'medium'
                ? 'Consider enabling 2FA for better security'
                : 'Enable additional security features'
              }
            </Typography>
            <Button
              component={Link}
              to="/dashboard/settings"
              variant="outlined"
              size="small"
              fullWidth
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Enhance Security
            </Button>
          </Box>

          {/* View All Settings */}
          <Button
            component={Link}
            to="/dashboard/settings"
            variant="contained"
            fullWidth
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            View All Settings
          </Button>

          {/* Save Status */}
          {saveSuccess && (
            <Alert 
              severity="success" 
              sx={{ 
                borderRadius: 2,
                '& .MuiAlert-message': { width: '100%' }
              }}
            >
              Settings updated successfully
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};