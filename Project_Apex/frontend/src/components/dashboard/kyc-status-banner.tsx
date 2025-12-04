import { Box, Button, Typography, Alert, alpha } from '@mui/material';
import { useRouter } from '@tanstack/react-router';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useAuth } from '@/providers/auth-provider';
import type { KycStatus } from '@/api/models/KycStatus';

export const KycStatusBanner = () => {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const kycStatus = user.kyc_status as KycStatus;

  // Don't show banner for approved users
  if (kycStatus === 'APPROVED') {
    return null;
  }

  const handleStartKyc = () => {
    router.navigate({ to: '/kyc' });
  };

  // REJECTED status - show resubmission banner
  if (kycStatus === 'REJECTED') {
    return (
      <Alert
        severity="error"
        icon={<ErrorOutlineIcon />}
        sx={(theme) => ({
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.error.main, 0.3)}` ,
          background: `linear-gradient(140deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(theme.palette.error.main, 0.08)})`,
          boxShadow: `0 24px 60px -40px ${alpha(theme.palette.error.main, 0.6)}` ,
          '& .MuiAlert-message': {
            width: '100%',
          },
        })}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              KYC Verification Rejected
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Your previous submission was rejected. Please review the feedback and resubmit your
              documents.
              {user.kyc_rejected_reason && (
                <>
                  {' '}
                  <strong>Reason:</strong> {user.kyc_rejected_reason}
                </>
              )}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="error"
            size="medium"
            onClick={handleStartKyc}
            sx={{ flexShrink: 0 }}
          >
            Resubmit Documents
          </Button>
        </Box>
      </Alert>
    );
  }

  // UNDER_REVIEW status - show review banner
  if (kycStatus === 'UNDER_REVIEW') {
    return (
      <Alert
        severity="info"
        icon={<InfoIcon />}
        sx={(theme) => ({
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.info.main, 0.3)}` ,
          background: `linear-gradient(140deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(theme.palette.info.main, 0.08)})`,
          boxShadow: `0 24px 60px -40px ${alpha(theme.palette.info.main, 0.6)}` ,
          '& .MuiAlert-message': {
            width: '100%',
          },
        })}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              KYC Verification Under Review
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Our compliance team is reviewing your documents. We'll notify you once the review is
              complete. This usually takes 24-48 hours.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="info"
            size="medium"
            onClick={handleStartKyc}
            sx={{ flexShrink: 0 }}
          >
            View Status
          </Button>
        </Box>
      </Alert>
    );
  }

  // PENDING status (default) - show action required banner
  return (
    <Alert
      severity="warning"
      icon={<WarningAmberIcon />}
      sx={(theme) => ({
        mb: 3,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}` ,
        background: `linear-gradient(140deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(theme.palette.warning.main, 0.08)})`,
        boxShadow: `0 24px 60px -40px ${alpha(theme.palette.warning.main, 0.6)}` ,
        '& .MuiAlert-message': {
          width: '100%',
        },
      })}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Complete Your Identity Verification
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Verify your identity to unlock withdrawals and higher trading limits. You can deposit and trade with basic features before verification.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="warning"
          size="medium"
          onClick={handleStartKyc}
          sx={{ flexShrink: 0 }}
        >
          Start Verification
        </Button>
      </Box>
    </Alert>
  );
};
