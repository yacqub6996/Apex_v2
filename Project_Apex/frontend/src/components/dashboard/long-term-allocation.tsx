import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Slider,
} from '@mui/material';
import Button from '@mui/material/Button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { LongTermService } from '@/api/services/LongTermService';
import type { SubscribeLongTermResponse } from '@/api/models/SubscribeLongTermResponse';

interface LongTermAllocationProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (response: SubscribeLongTermResponse) => void;
  preSelectedPlanId?: string;
  onRequestTopUp?: () => void;
}

export const LongTermAllocation = ({
  open,
  onClose,
  onSuccess,
  preSelectedPlanId,
  onRequestTopUp,
}: LongTermAllocationProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string>(preSelectedPlanId ?? '');
  const [amountInput, setAmountInput] = useState<string>('');
  const [lockDuration, setLockDuration] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  const lockMarks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        value: index + 1,
        label: String(index + 1),
      })),
    [],
  );

  const isKycApproved = user?.kyc_status === 'APPROVED';
  const longTermWalletBalance = Number((user as any)?.long_term_wallet_balance ?? 0);

  const plansQuery = useQuery({
    queryKey: ['long-term-plans'],
    queryFn: async () => (await LongTermService.longTermListLongTermPlans()).data,
    enabled: open,
  });

  const selectedPlan = plansQuery.data?.find((p: any) => p.id === selectedPlanId);
  const minDeposit = selectedPlan ? Number((selectedPlan as any).minimum_deposit ?? 0) : 0;

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const amt = Number(amountInput);
      return LongTermService.longTermSubscribeToLongTermPlan({
        plan_id: selectedPlanId,
        amount: amt,
        lock_duration_months: lockDuration,
      });
    },
    onSuccess: (res) => {
      onSuccess?.(res);
      queryClient.invalidateQueries({ queryKey: ['long-term-investments'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setSelectedPlanId('');
      setAmountInput('');
      setLockDuration(3);
      setError(null);
      onClose();
    },
    onError: (e: any) => setError(e?.body?.detail || e?.message || 'Failed to allocate funds'),
  });

  const unlockDate = useMemo(() => {
    if (!lockDuration || Number.isNaN(lockDuration)) return null;
    const base = new Date();
    const target = new Date(base.getFullYear(), base.getMonth() + lockDuration, base.getDate());
    return target;
  }, [lockDuration]);

  const validate = (): boolean => {
    setError(null);
    if (!selectedPlanId) {
      setError('Please select a plan');
      return false;
    }
    const amt = Number(amountInput);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (amt < minDeposit) {
      setError(`Minimum deposit for this plan is $${minDeposit.toLocaleString()}`);
      return false;
    }
    if (amt > longTermWalletBalance) {
      setError('Insufficient long-term wallet balance');
      return false;
    }
    if (!Number.isFinite(lockDuration) || lockDuration < 1 || lockDuration > 6) {
      setError('Select a lock duration between 1 and 6 months');
      return false;
    }
    return true;
  };

  const submit = () => {
    if (!isKycApproved) return;
    if (!validate()) return;
    subscribeMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Allocate to Long-Term Investment</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {!isKycApproved && (
            <Alert severity="warning">KYC approval required for long-term allocations. <a href="/kyc" className="underline">Complete KYC</a>.</Alert>
          )}

          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">Long-Term Wallet Balance</Typography>
                  <Typography variant="h6" color="primary">
                    ${longTermWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Button variant="contained" size="small" onClick={onRequestTopUp} disabled={!onRequestTopUp}>
                  Add From Main Wallet
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <FormControl fullWidth>
            <Typography variant="subtitle2" gutterBottom>Select Investment Plan</Typography>
            <Select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value as string)} disabled={plansQuery.isLoading || !isKycApproved} displayEmpty>
              <MenuItem value=""><em>Choose a plan...</em></MenuItem>
              {plansQuery.data?.map((p: any) => (
                <MenuItem key={p.id} value={p.id}>{p.name} - Min: ${Number(p.minimum_deposit ?? 0).toLocaleString()}</MenuItem>
              ))}
            </Select>
            <FormHelperText>Select a plan for allocation</FormHelperText>
          </FormControl>

          <FormControl fullWidth>
            <Typography variant="subtitle2" gutterBottom>Lock Duration (months)</Typography>
            <Slider
              value={lockDuration}
              min={1}
              max={6}
              step={1}
              marks={lockMarks}
              valueLabelDisplay="on"
              onChange={(_, value) => setLockDuration(value as number)}
              disabled={!isKycApproved}
              aria-label="Lock duration in months"
            />
            <FormHelperText>
              {unlockDate
                ? `Funds locked until ${unlockDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}`
                : 'Choose between 1 and 6 months'}
            </FormHelperText>
          </FormControl>

          <FormControl fullWidth>
            <Typography variant="subtitle2" gutterBottom>Allocation Amount</Typography>
            <TextField type="number" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} disabled={!isKycApproved} />
            {selectedPlan && (
              <FormHelperText>Minimum: ${minDeposit.toLocaleString()}</FormHelperText>
            )}
          </FormControl>

          {error && <Alert severity="error">{error}</Alert>}

          {selectedPlan && amountInput && !error && Number(amountInput) >= minDeposit && (
            <Card variant="outlined" sx={{ borderColor: 'success.main' }}>
              <CardContent>
                <Typography variant="subtitle2" color="success.main" gutterBottom>Allocation Summary</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Long-Term Wallet</Typography>
                    <Typography variant="body1" fontWeight={600}>${longTermWalletBalance.toLocaleString()}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">After Allocation</Typography>
                    <Typography variant="body1" fontWeight={600}>${(longTermWalletBalance - Number(amountInput)).toLocaleString()}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">Lock Duration</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {lockDuration} {lockDuration === 1 ? 'month' : 'months'} &mdash; unlocks {unlockDate?.toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={subscribeMutation.isPending} aria-busy={subscribeMutation.isPending}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={!isKycApproved || !selectedPlanId || !amountInput || subscribeMutation.isPending} aria-busy={subscribeMutation.isPending} startIcon={subscribeMutation.isPending ? <CircularProgress size={16} /> : undefined}>
          {subscribeMutation.isPending ? 'Allocating...' : 'Allocate Funds'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
