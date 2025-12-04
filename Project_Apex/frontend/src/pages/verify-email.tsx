import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Box, Button, Typography, Paper, Alert, CircularProgress, Stack } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { UntitledLogo } from '@/components/foundations/logo/untitledui-logo';
import { UntitledLogoMinimal } from '@/components/foundations/logo/untitledui-logo-minimal';
import { EmailVerificationService } from '@/services/email-verification-service';
import { useAuth } from '@/providers/auth-provider';

type VerificationState = 'idle' | 'verifying' | 'success' | 'error';

export const VerifyEmailPage = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [state, setState] = useState<VerificationState>('idle');
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const token = useMemo(() => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(search);
      return params.get('token');
    } catch (err) {
      console.error('Failed to parse verification token', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setState('idle');
        return;
      }
      setState('verifying');
      setError(null);
      try {
        await EmailVerificationService.verifyEmail(token);
        await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        setState('success');
      } catch (err: any) {
        const detail = err?.body?.detail || err?.message || 'Verification failed. Please try again.';
        setError(String(detail));
        setState('error');
      }
    };

    verify();
  }, [queryClient, token]);

  useEffect(() => {
    if (state !== 'success') return;
    const timeout = setTimeout(() => {
      if (isAuthenticated) {
        router.navigate({ to: '/dashboard' });
      } else {
        router.navigate({ to: '/login' });
      }
    }, 1200);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, router, state]);

  const headline =
    state === 'success'
      ? 'Email verified!'
      : state === 'error'
        ? 'Verification failed'
        : token
          ? 'Verifying your email...'
          : 'Check your inbox';

  const description =
    state === 'success'
      ? 'Your email is now verified. Continue to the dashboard to finish onboarding.'
      : state === 'error'
        ? error || 'We could not verify your email. You can retry from the link in your inbox.'
        : token
          ? 'Hang tight while we confirm your verification link.'
          : 'Open the verification link we just sent. If you do not see it, check spam or request another.';

  const statusColor = state === 'success' ? 'success' : state === 'error' ? 'warning' : 'info';
  const statusIcon =
    state === 'success'
      ? <CheckCircleOutlineRoundedIcon />
      : state === 'error'
        ? <WarningAmberRoundedIcon />
        : <InfoIcon />;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 520,
          width: '100%',
          p: 4,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <UntitledLogo className="max-md:hidden w-[165px] h-[115.5px] mx-auto mb-4" />
          <UntitledLogoMinimal className="w-[165px] h-[115.5px] md:hidden mx-auto mb-4" />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Email Verification
          </Typography>
        </Box>

        <Alert severity={statusColor} icon={state === 'verifying' ? <CircularProgress size={18} /> : statusIcon} sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.primary" fontWeight={600}>
            {headline}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
          {!token && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Need a new link? After logging in you can resend from settings or request another from support.
            </Typography>
          )}
        </Alert>

        <Stack spacing={2}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => router.navigate({ to: '/dashboard' })}
            disabled={state === 'verifying'}
          >
            Go to dashboard
          </Button>
          <Button fullWidth variant="outlined" size="large" onClick={() => router.navigate({ to: '/login' })}>
            Back to login
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
