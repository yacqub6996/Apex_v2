import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useAuth } from '@/providers/auth-provider';
import { ProfilePictureUpload } from '@/components/profile-picture-upload/ProfilePictureUpload';
import { Panel } from '@/components/shared';

interface ProfileSettingsProps {
  user?: {
    email?: string;
    full_name?: string | null;
  } | null;
}

interface ProfileFormData {
  email: string;
  fullName: string;
}

interface FormErrors {
  email?: string;
  fullName?: string;
}

export const ProfileSettings = ({ user }: ProfileSettingsProps) => {
  const { user: current } = useAuth();
  const [profileData, setProfileData] = useState<ProfileFormData>({
    email: user?.email || '',
    fullName: user?.full_name || '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Full name validation
    if (!profileData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (profileData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    // Email validation
    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof ProfileFormData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear success message when form changes
    if (saveSuccess) {
      setSaveSuccess(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setSaveSuccess(false);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // TODO: Implement actual profile update
      console.log('Saving profile:', profileData);
      
      setSaveSuccess(true);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Panel title="Profile Settings">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Avatar uploader */}
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Profile picture</Typography>
          <ProfilePictureUpload
            currentUrl={(current as any)?.profile_picture_url as string | undefined}
            displayName={profileData.fullName || user?.full_name || user?.email || ''}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {saveSuccess && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSaveSuccess(false)}
          >
            Profile updated successfully!
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Full Name"
            value={profileData.fullName}
            onChange={(e) => handleFieldChange('fullName', e.target.value)}
            placeholder="Enter your full name"
            variant="outlined"
            fullWidth
            error={!!errors.fullName}
            helperText={errors.fullName}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          
          <TextField
            label="Email Address"
            type="email"
            value={profileData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="Enter your email address"
            variant="outlined"
            fullWidth
            error={!!errors.email}
            helperText={errors.email}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
            sx={{
              minWidth: 120,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Panel>
  );
};
