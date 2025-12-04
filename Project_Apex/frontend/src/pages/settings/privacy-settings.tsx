import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  
} from '@mui/material';
import { Close as CloseIcon, PrivacyTip as PrivacyIcon } from '@mui/icons-material';
import { Panel } from '@/components/shared';

interface PrivacySettingsState {
  dataCollection: boolean;
  analytics: boolean;
  marketingEmails: boolean;
  thirdPartySharing: boolean;
  profileVisibility: 'public' | 'private';
}

export const PrivacySettings = () => {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsState>({
    dataCollection: true,
    analytics: true,
    marketingEmails: false,
    thirdPartySharing: false,
    profileVisibility: 'private',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updatePrivacySetting = (key: keyof PrivacySettingsState, value: any) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
    
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
      
      // TODO: Implement privacy preferences update
      console.log('Saving privacy preferences:', privacySettings);
      
      setSaveSuccess(true);
    } catch (error) {
      console.error('Failed to save privacy preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Exporting user data...');
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Simulate account deletion
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('Deleting account...');
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Failed to delete account:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const PrivacyItem = ({ 
    title, 
    description, 
    enabled,
    onChange
  }: { 
    title: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
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
              onChange={(e) => onChange(e.target.checked)}
              color="primary"
            />
          }
          label=""
        />
      </Box>
    </Box>
  );

  return (
    <>
      <Panel 
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PrivacyIcon />
            <Typography variant="h5" component="span">Privacy Settings</Typography>
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
              Privacy preferences updated successfully!
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <PrivacyItem
              title="Data Collection"
              description="Allow us to collect usage data to improve our services"
              enabled={privacySettings.dataCollection}
              onChange={(value) => updatePrivacySetting('dataCollection', value)}
              />

              <PrivacyItem
                title="Analytics"
                description="Help us understand how you use the platform"
                enabled={privacySettings.analytics}
                onChange={(value) => updatePrivacySetting('analytics', value)}
              />

              <PrivacyItem
                title="Marketing Emails"
                description="Receive promotional emails and updates"
                enabled={privacySettings.marketingEmails}
                onChange={(value) => updatePrivacySetting('marketingEmails', value)}
              />

              <PrivacyItem
                title="Third-Party Sharing"
                description="Allow sharing of anonymized data with trusted partners"
                enabled={privacySettings.thirdPartySharing}
                onChange={(value) => updatePrivacySetting('thirdPartySharing', value)}
              />
            </Box>

            {/* Profile Visibility */}
            <Box
              sx={{
                p: 3,
                border: "none",
                boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 2 }}>
                Profile Visibility
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={privacySettings.profileVisibility}
                  onChange={(e) => updatePrivacySetting('profileVisibility', e.target.value)}
                >
                  <FormControlLabel
                    value="public"
                    control={<Radio color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          Public
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Other users can see your profile and trading activity
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    value="private"
                    control={<Radio color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          Private
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Only you can see your profile and trading activity
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Box>

            {/* Data Management */}
            <Box
              sx={{
                p: 3,
                border: "none",
                boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 1 }}>
                Data Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Download a copy of your personal data or request account deletion
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  onClick={() => setIsExportModalOpen(true)}
                  variant="contained"
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Export My Data
                </Button>
                <Button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  variant="contained"
                  color="error"
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Delete Account
                </Button>
              </Box>
            </Box>

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
                🔒 Your Privacy Matters
              </Typography>
              <Typography variant="body2">
                We never sell your personal data. All data is encrypted and stored securely 
                in compliance with global privacy regulations.
              </Typography>
            </Alert>
          </Box>
        </Panel>

        {/* Data Export Modal */}
        <Dialog 
          open={isExportModalOpen} 
          onClose={() => setIsExportModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Export Your Data
          <IconButton onClick={() => setIsExportModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            We'll prepare a downloadable archive containing all your personal data, including:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li" variant="body2">Profile information</Typography>
            <Typography component="li" variant="body2">Trading history</Typography>
            <Typography component="li" variant="body2">Account settings</Typography>
            <Typography component="li" variant="body2">Transaction records</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            This process may take a few minutes. You'll receive an email with the download link.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsExportModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExportData}
            variant="contained"
            disabled={isExporting}
            startIcon={isExporting ? <CircularProgress size={16} /> : null}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {isExporting ? 'Preparing...' : 'Start Export'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Deletion Modal */}
      <Dialog 
        open={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Delete Account
          <IconButton onClick={() => setIsDeleteModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              ⚠️ This action cannot be undone
            </Typography>
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete your account? This will permanently:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li" variant="body2">Delete all your personal data</Typography>
            <Typography component="li" variant="body2">Remove your trading history</Typography>
            <Typography component="li" variant="body2">Cancel any active investments</Typography>
            <Typography component="li" variant="body2">Close your account permanently</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            You will lose access to all your funds and trading data. This action is irreversible.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteAccount}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : null}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
