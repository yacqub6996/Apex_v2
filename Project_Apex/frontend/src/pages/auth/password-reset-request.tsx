import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Box, Button, TextField, Typography, Alert, Paper } from '@mui/material';
import { motion } from 'motion/react';
import { UntitledLogo } from '@/components/foundations/logo/untitledui-logo';
import { UntitledLogoMinimal } from '@/components/foundations/logo/untitledui-logo-minimal';

export const PasswordResetRequest = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? ''}/api/v1/password-reset-request?email=${encodeURIComponent(
          email,
        )}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || 'Failed to submit password reset request');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
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
                Request Received
              </Typography>
              <Typography variant="body2" color="text.secondary">
                If an account exists for this email, you&apos;ll receive a reset link shortly.
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Please check your inbox and spam folder for an email with a password reset link. The link is
                time-limited to help keep your account secure.
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              <strong>What happens next:</strong>
              <br />
              • Open the email we send you
              <br />
              • Click the reset link to choose a new password
              <br />
              • Sign in using your updated password
            </Typography>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => router.navigate({ to: '/login' })}
              sx={{ mb: 2 }}
            >
              Return to Login
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Need immediate help?{' '}
                <Button
                  variant="text"
                  size="small"
                  href="/support"
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                >
                  Contact Support
                </Button>
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Carousel side - matching login/signup design */}
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
              Secure Password Recovery
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              When you submit your email, we&apos;ll send a secure, time-limited password reset link if an
              account exists. This keeps your account safe while making recovery fast and simple.
            </Typography>
          </Box>
        </Box>
      </motion.section>
    );
  }

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
              Reset Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your email to request a password reset. If an account exists, you&apos;ll receive a secure
              reset link.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              required
              type="email"
              label="Email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              sx={{ mb: 2 }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              sx={{ mb: 2 }}
            >
              {isSubmitting ? 'Submitting...' : 'Request Password Reset'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="text"
                onClick={() => router.navigate({ to: '/login' })}
                sx={{ textTransform: 'none' }}
              >
                Back to Login
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Carousel side - matching login/signup design */}
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
            Need Help?
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            If no email arrives after a few minutes, double-check the address you entered or contact support
            for assistance. For security, we only indicate success if an account may exist for that email.
          </Typography>
        </Box>
      </Box>
    </motion.section>
  );
};

