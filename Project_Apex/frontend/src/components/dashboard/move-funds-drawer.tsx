import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { CopyTradingService } from '@/api/services/CopyTradingService';
import { WalletTransferDirection } from '@/api/models/WalletTransferDirection';
import { transferToLongTermWallet } from '@/services/long-term-investment-actions';

type RouteKey =
  | 'MAIN_TO_COPY'
  | 'COPY_TO_MAIN'
  | 'MAIN_TO_LONG_TERM'
  | 'LONG_TERM_TO_MAIN';

export function MoveFundsDrawer({ open, onClose, initialRoute }: {
  open: boolean;
  onClose: () => void;
  initialRoute?: RouteKey;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [route, setRoute] = useState<RouteKey>('MAIN_TO_COPY');
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const isKycApproved = user?.kyc_status === 'APPROVED';
  const walletBalance = Number((user as any)?.wallet_balance ?? user?.availableBalance ?? 0);
  const copyWalletBalance = Number((user as any)?.copy_trading_wallet_balance ?? 0);
  const longTermWalletBalance = Number((user as any)?.long_term_wallet_balance ?? 0);

  const pendingQuery = useQuery({
    queryKey: ['pending-summary'],
    // No aggregated pending summary in new API; default to zeroes to avoid blocking UI
    queryFn: async () => ({
      main_wallet_pending: 0,
      copy_trading_wallet_pending: 0,
      long_term_wallet_pending: 0,
    }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setAmount('');
      setError(null);
      setRoute('MAIN_TO_COPY');
      return;
    }
    // When opening, apply any provided initial values
    if (initialRoute) setRoute(initialRoute);
  }, [open, initialRoute]);

  const spendable = useMemo(() => {
    switch (route) {
      case 'MAIN_TO_COPY':
      case 'MAIN_TO_LONG_TERM': {
        const mainPending = (pendingQuery.data as any)?.main_wallet_pending ?? 0;
        return Math.max(0, walletBalance - mainPending);
      }
      case 'COPY_TO_MAIN': {
        const copyPending = (pendingQuery.data as any)?.copy_trading_wallet_pending ?? 0;
        return Math.max(0, copyWalletBalance - copyPending);
      }
      case 'LONG_TERM_TO_MAIN': {
        const longPending = (pendingQuery.data as any)?.long_term_wallet_pending ?? 0;
        return Math.max(0, longTermWalletBalance - longPending);
      }
      default:
        return 0;
    }
  }, [route, walletBalance, copyWalletBalance, longTermWalletBalance, pendingQuery.data]);

  const requiresKyc = route === 'MAIN_TO_LONG_TERM';
  const isDisabledByKyc = requiresKyc && !isKycApproved;

  const validate = (): boolean => {
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid positive amount');
      return false;
    }
    if (amt > spendable) {
      setError(`Amount exceeds available balance. Max: $${spendable.toFixed(2)}`);
      return false;
    }
    return true;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      switch (route) {
        case 'MAIN_TO_COPY':
          return CopyTradingService.copyTradingFundWallet({ amount: amt });
        case 'COPY_TO_MAIN':
          // The new API exposes withdrawal via admin simulations for approval flows;
          // copy-trading user endpoint is not present. For now, raise a friendly error.
          throw new Error('Copy Trading withdrawal endpoint not available. Please use the Withdraw section.');
        case 'MAIN_TO_LONG_TERM':
          return transferToLongTermWallet({ 
            amount: amt, 
            direction: WalletTransferDirection.MAIN_TO_LONG_TERM 
          });
        case 'LONG_TERM_TO_MAIN':
          // No direct endpoint in client; handled on Long-Term page. Surface message.
          throw new Error('Long-Term wallet withdrawal is requested from the Long-Term page.');
      }
    },
    onMutate: async () => {
      // Cancel ongoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['currentUser'] });
      await queryClient.cancelQueries({ queryKey: ['long-term-investments'] });

      // Get previous user data for rollback
      const previousUser = queryClient.getQueryData(['currentUser']);

      // Optimistically update the cache based on the transfer route
      if (previousUser && route === 'MAIN_TO_LONG_TERM') {
        const amt = Number(amount);
        const updated = {
          ...previousUser,
          wallet_balance: Math.max(0, (previousUser as any).wallet_balance - amt),
          long_term_wallet_balance: ((previousUser as any).long_term_wallet_balance || 0) + amt,
        };
        queryClient.setQueryData(['currentUser'], updated);
      }

      return { previousUser };
    },
    onSuccess: () => {
      // Force a fresh refetch to ensure server state is authoritative
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['long-term-investments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onClose();
    },
    onError: (e: any, _variables, context: any) => {
      // Rollback to previous data if mutation fails
      if (context?.previousUser) {
        queryClient.setQueryData(['currentUser'], context.previousUser);
      }
      const msg = e?.body?.detail || e?.message || 'Failed to move funds';
      setError(String(msg));
    },
  });

  const submit = () => {
    if (isDisabledByKyc) return;
    if (!validate()) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Move Funds</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {isDisabledByKyc && (
            <Alert severity="warning">
              This action requires KYC approval. Please <a href="/kyc" className="underline">complete KYC</a>.
            </Alert>
          )}

          <FormControl>
            <Typography variant="subtitle2" gutterBottom>Select Route</Typography>
            <RadioGroup
              value={route}
              onChange={(e) => setRoute(e.target.value as RouteKey)}
            >
              <FormControlLabel value="MAIN_TO_COPY" control={<Radio />} label="Main Wallet → Copy Trading Wallet" />
              <FormControlLabel value="MAIN_TO_LONG_TERM" control={<Radio />} label="Main Wallet → Long-Term Wallet" />
            </RadioGroup>
            <FormHelperText>Withdrawals are managed separately for approval flows.</FormHelperText>
          </FormControl>

          <FormControl fullWidth>
            <Typography variant="subtitle2" gutterBottom>Amount</Typography>
            <TextField
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              disabled={isDisabledByKyc}
            />
            <FormHelperText>Spendable: ${spendable.toFixed(2)}</FormHelperText>
          </FormControl>

          {error && <Alert severity="error">{error}</Alert>}

          <Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Main Wallet</Typography>
                <Typography variant="body2" fontWeight={700}>${walletBalance.toFixed(2)}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary">Copy Trading Wallet</Typography>
                <Typography variant="body2" fontWeight={700}>${copyWalletBalance.toFixed(2)}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">Long-Term Wallet</Typography>
                <Typography variant="body2" fontWeight={700}>${longTermWalletBalance.toFixed(2)}</Typography>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={isDisabledByKyc || mutation.isPending} aria-busy={mutation.isPending}>
          {mutation.isPending ? 'Moving...' : 'Move Funds'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
