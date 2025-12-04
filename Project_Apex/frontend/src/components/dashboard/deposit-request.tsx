import React, { useState } from 'react';
import Button from '@mui/material/Button';
import { Paper, Box, Typography } from '@mui/material';
import { DepositModal } from '@/components/crypto/deposit/DepositModal';

interface DepositRequestProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * DepositRequest - Crypto-only deposit request component
 * Opens the new DepositModal for the complete crypto deposit flow
 */
export const DepositRequest: React.FC<DepositRequestProps> = () => {
  const [openCryptoModal, setOpenCryptoModal] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Crypto Deposit
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Deposit funds using cryptocurrency with our secure, streamlined process
      </Typography>

      <Box sx={{ mt: 2, display: 'grid', gap: 2 }}>
        <Button
          onClick={() => setOpenCryptoModal(true)}
          variant="contained"
          size="large"
          sx={{ px: 3 }}
        >
          Make Crypto Deposit
        </Button>

        <Typography variant="caption" color="text.secondary">
          Supported: Bitcoin (BTC), Ethereum (ETH), Tether (USDT), USD Coin (USDC)
          <br />
          Minimum deposit: $50.00 • VAT fee: $5.00
        </Typography>
      </Box>

      {/* Crypto Deposit Modal */}
      <DepositModal
        open={openCryptoModal}
        onClose={() => setOpenCryptoModal(false)}
      />
    </Paper>
  );
};
