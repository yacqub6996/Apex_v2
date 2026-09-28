import { useEffect, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { useAuth } from '@/providers/auth-provider';
import { EmailVerificationService } from '@/services/email-verification-service';

const RESEND_COOLDOWN_SECONDS = 60;
const DISMISS_STORAGE_KEY = 'apex.email-verification-banner.dismissed';

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal =
    local.length > 1 ? `${local[0]}${'•'.repeat(Math.min(local.length - 1, 6))}` : '•';
  return `${maskedLocal}@${domain}`;
};

type ResendStatus = 'idle' | 'sending' | 'sent' | 'error';

export const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [status, setStatus] = useState<ResendStatus>('idle');
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isUnverified = Boolean(user && !user.email_verified);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        const next = Math.max(prev - 1, 0);
        if (next === 0) {
          setStatus((current) => (current === 'sent' || current === 'error' ? 'idle' : current));
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isUnverified || dismissed) return null;

  const handleResend = async () => {
    if (!user || status === 'sending' || cooldown > 0) return;
    setStatus('sending');
    setErrorMessage(null);
    try {
      await EmailVerificationService.resendVerification(user.email);
      setStatus('sent');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setStatus('error');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not resend the verification email. Please try again.',
      );
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures; the banner simply reappears next session.
    }
  };

  const resendLabel =
    cooldown > 0 ? `Resend in ${cooldown}s` : status === 'sending' ? 'Sending...' : 'Resend verification';

  return (
    <Alert
      severity="info"
      icon={<MailOutlineIcon fontSize="inherit" />}
      sx={{ mb: 2, borderRadius: 2, alignItems: 'flex-start' }}
      action={
        <IconButton size="small" aria-label="Dismiss verification reminder" onClick={handleDismiss}>
          <CloseIcon fontSize="inherit" />
        </IconButton>
      }
    >
      <Typography variant="subtitle2" fontWeight={600}>
        Verify your email
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Your account is active, but withdrawals require a verified email. We sent a verification link to{' '}
        <strong>{maskEmail(user?.email ?? '')}</strong>.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Button
          size="small"
          variant="contained"
          onClick={handleResend}
          disabled={cooldown > 0 || status === 'sending'}
          sx={{ textTransform: 'none' }}
        >
          {resendLabel}
        </Button>
        <Button size="small" variant="text" href="/verify-email" sx={{ textTransform: 'none' }}>
          Open verification page
        </Button>
      </Stack>
      {status === 'sent' && (
        <Typography role="status" variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
          Verification email sent — check your inbox.
        </Typography>
      )}
      {status === 'error' && (
        <Typography role="alert" variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
          {errorMessage}
        </Typography>
      )}
    </Alert>
  );
};
