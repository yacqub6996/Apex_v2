import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import { Close as CloseIcon, Security as SecurityIcon } from '@mui/icons-material';
import { Panel } from '@/components/shared';

interface SecuritySettingsProps {
  user?: unknown;
}

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export const SecuritySettings = (_props: SecuritySettingsProps) => {
  const [enable2FA, setEnable2FA] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Mock sessions data
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: '1',
      device: 'Chrome on Windows',
      location: 'Lagos, Nigeria',
      lastActive: '2 hours ago',
      current: true
    },
    {
      id: '2',
      device: 'Safari on iPhone',
      location: 'Lagos, Nigeria',
      lastActive: '1 day ago',
      current: false
    },
    {
      id: '3',
      device: 'Firefox on Mac',
      location: 'Abuja, Nigeria',
      lastActive: '1 week ago',
      current: false
    }
  ]);

  const validatePassword = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setIsChangingPassword(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Changing password:', passwordData);
      
      // Reset form and close modal
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsPasswordModalOpen(false);
    } catch (error) {
      console.error('Failed to change password:', error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTerminateSession = (sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  const SecurityItem = ({
    title,
    description,
    status,
    action
  }: {
    title: string;
    description: string;
    status?: string;
    action: React.ReactNode;
  }) => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {description}
        </Typography>
        {status && (
          <Chip
            label={status}
            size="small"
            color={status === 'Enabled' ? 'success' : 'default'}
            variant="outlined"
          />
        )}
      </Box>
      <Box>
        {action}
      </Box>
    </Box>
  );

  return (
    <>
      <Panel 
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            <Typography variant="h5" component="span">Security Settings</Typography>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <SecurityItem
            title="Password"
            description="Last changed 3 months ago"
            action={
              <Button
                size="small"
                variant="contained"
                onClick={() => setIsPasswordModalOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Change Password
              </Button>
            }
          />

          <SecurityItem
            title="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            status={enable2FA ? 'Enabled' : 'Disabled'}
            action={
              <FormControlLabel
                control={
                  <Switch
                    checked={enable2FA}
                    onChange={(e) => setEnable2FA(e.target.checked)}
                    color="primary"
                  />
                }
                label=""
              />
            }
          />

          <SecurityItem
            title="Active Sessions"
            description={`${sessions.length} active session${sessions.length !== 1 ? 's' : ''}`}
            action={
              <Button
                size="small"
                variant="contained"
                onClick={() => setIsSessionsModalOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                View Sessions
              </Button>
            }
          />
        </Box>

        <Alert
          severity="info"
          sx={{
            mt: 4,
            borderRadius: 2,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            🔐 Security Best Practices
          </Typography>
          <Typography variant="body2">
            Enable 2FA, use a strong unique password, and regularly review your active sessions.
          </Typography>
        </Alert>
      </Panel>

      {/* Password Change Modal */}
      <Dialog
        open={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Change Password
          <IconButton onClick={() => setIsPasswordModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Current Password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              error={!!passwordErrors.currentPassword}
              helperText={passwordErrors.currentPassword}
              fullWidth
            />
            <TextField
              label="New Password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              error={!!passwordErrors.newPassword}
              helperText={passwordErrors.newPassword || 'Must be at least 8 characters'}
              fullWidth
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              error={!!passwordErrors.confirmPassword}
              helperText={passwordErrors.confirmPassword}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsPasswordModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={isChangingPassword}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sessions Modal */}
      <Dialog
        open={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Active Sessions
          <IconButton onClick={() => setIsSessionsModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage your logged-in devices and sessions
          </Typography>
          <List>
            {sessions.map((session, index) => (
              <Box key={session.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {session.device}
                        </Typography>
                        {session.current && (
                          <Chip label="Current" size="small" color="primary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {session.location}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Last active: {session.lastActive}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {!session.current && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleTerminateSession(session.id)}
                        sx={{ textTransform: 'none' }}
                      >
                        Terminate
                      </Button>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
                {index < sessions.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setIsSessionsModalOpen(false)}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
