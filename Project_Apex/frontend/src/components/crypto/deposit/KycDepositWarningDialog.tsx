import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { KycStatus } from '@/api/models/KycStatus';

interface KycDepositWarningDialogProps {
  open: boolean;
  kycStatus: KycStatus;
  onClose: () => void;
  onProceed: () => void;
}

export const KycDepositWarningDialog = ({
  open,
  kycStatus,
  onClose,
  onProceed,
}: KycDepositWarningDialogProps) => {
  const isApproved = kycStatus === 'APPROVED';

  if (isApproved) {
    // Don't show the dialog for approved users
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningAmberIcon color="warning" sx={{ fontSize: 28 }} />
          <Typography variant="h6" fontWeight={600}>
            KYC Verification Required for Withdrawals
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="info" icon={<CheckCircleOutlineIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Good news:</strong> You can deposit funds without KYC verification.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            However, please be aware that <strong>withdrawals require KYC verification</strong>.
            You won't be able to withdraw your funds until you complete the identity verification
            process.
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Current KYC Status:</strong>{' '}
            <Box
              component="span"
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'warning.light',
                color: 'warning.dark',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              {kycStatus.replace('_', ' ')}
            </Box>
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            What you can do:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 0 }}>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              ✓ Deposit funds anytime
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              ✓ Start trading immediately
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              ✓ Complete KYC verification at your convenience
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              ✗ Withdrawals locked until KYC is approved
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" size="large" sx={{ flex: 1 }}>
          Cancel
        </Button>
        <Button onClick={onProceed} variant="contained" size="large" sx={{ flex: 1 }}>
          I Understand, Proceed
        </Button>
      </DialogActions>
    </Dialog>
  );
};
