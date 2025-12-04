/**
 * WithdrawalPendingStep - Show confirmation after withdrawal submission
 */

import React from 'react'
import {
  Box,
  Stack,
  Typography,
  Alert,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

interface WithdrawalPendingStepProps {
  onClose: () => void
}

export const WithdrawalPendingStep: React.FC<WithdrawalPendingStepProps> = () => {
  return (
    <Stack spacing={3}>
      {/* Success Message */}
      <Alert severity="success" icon={<CheckCircleIcon />}>
        <Typography variant="body2" fontWeight={500}>
          Withdrawal Request Submitted
        </Typography>
        <Typography variant="caption">
          Your withdrawal request has been submitted successfully. Our team will review and process it within 5-30 minutes.
        </Typography>
      </Alert>

      {/* Next Steps */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          What happens next?
        </Typography>
        <Stack component="ol" spacing={1} sx={{ pl: 2 }}>
          <Typography component="li" variant="body2">
            Our admin team will verify your withdrawal request
          </Typography>
          <Typography component="li" variant="body2">
            Once approved, the funds will be sent to your specified address
          </Typography>
          <Typography component="li" variant="body2">
            You'll receive a notification once the transaction is complete
          </Typography>
        </Stack>
      </Box>

      {/* Info Alert */}
      <Alert severity="info">
        <Typography variant="caption">
          You can check the status of your withdrawal in your transaction history. We'll notify you of any updates.
        </Typography>
      </Alert>
    </Stack>
  )
}
