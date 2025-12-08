import { useState, useEffect } from 'react';
import { useSearch } from '@tanstack/react-router';
import { Box, Button, TextField, Typography, Alert, Paper } from '@mui/material';
import { motion } from 'motion/react';
import { UntitledLogo } from '@/components/foundations/logo/untitledui-logo';
import { UntitledLogoMinimal } from '@/components/foundations/logo/untitledui-logo-minimal';
import { LoginService } from '@/api/services/LoginService';

export const PasswordReset = () => {
  const search = useSearch({ from: '/reset-password' }) as { token?: string };
  const [token, setToken] = useState<string>(search.token ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (search.token && !token) {
      setToken(search.token);
    }
  }, [search.token, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!token) {
      setError('Reset link is missing or invalid.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await LoginService.loginResetPassword({
        token,
        new_password: password,
      });
      setSuccessMessage('Your password has been reset successfully. You can now log in with your new password.');
    } catch (err: any) {
      const detail = err?.body?.detail || err?.message || 'Failed to reset password';
      setError(String(detail));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="grid h-screen grid-cols-1 bg-primary lg:grid-cols-2"
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, md: 8 },
          py: { xs: 4, md: 8 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 480,
            width: '100%',
            p: 4,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <UntitledLogo className="max-md:hidden w-[165px] h-[115.5px] mx-auto mb-4" />
            <UntitledLogoMinimal className="w-[165px] h-[115.5px] md:hidden mx-auto mb-4" />
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Set a new password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter a new password for your Apex account.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              type="password"
              label="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Resetting...' : 'Reset password'}
            </Button>
          </Box>
        </Paper>
      </Box>

      <Box
        className="hidden lg:flex"
        sx={{
          bgcolor: 'primary.main',
          alignItems: 'center',
          justifyContent: 'center',
          p: 8,
        }}
      >
        <Box sx={{ maxWidth: 560, color: 'primary.contrastText' }}>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Secure Password Reset
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            This link is time-limited for your security. If it has expired, you can request a new password reset from the login page.
          </Typography>
        </Box>
      </Box>
    </motion.section>
  );
};
