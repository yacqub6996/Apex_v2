import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Drawer, Box, Typography, TextField, Button, Divider, Stack, Alert } from '@mui/material';
import { TradersService } from '@/api/services/TradersService';
import type { TraderProfilePublic } from '@/api/models/TraderProfilePublic';

type Props = {
  open: boolean;
  traderId: string | null;
  onClose: () => void;
};

export const TraderEditDrawer = ({ open, traderId, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [totalCopiers, setTotalCopiers] = useState<string>('0');
  const [assetsUnderCopy, setAssetsUnderCopy] = useState<string>('0');
  const [avgMonthlyReturn, setAvgMonthlyReturn] = useState<string>('0');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const traderQuery = useQuery<TraderProfilePublic | undefined>({
    queryKey: ['admin-trader', traderId],
    queryFn: async () => {
      if (!traderId) return undefined;
      return TradersService.tradersReadTraderById(traderId);
    },
    enabled: open && Boolean(traderId),
  });

  useEffect(() => {
    const t = traderQuery.data as any;
    if (!t) return;
    setTotalCopiers(String(t.total_copiers ?? 0));
    setAssetsUnderCopy(String(t.total_assets_under_copy ?? 0));
    setAvgMonthlyReturn(String(t.average_monthly_return ?? 0));
  }, [traderQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!traderId) return;
      setMessage(null);
      setError(null);
      const payload: any = {
        total_copiers: Math.max(0, parseInt(totalCopiers || '0', 10)),
        total_assets_under_copy: Math.max(0, parseFloat(assetsUnderCopy || '0')),
        average_monthly_return: Math.max(-100, Math.min(100, parseFloat(avgMonthlyReturn || '0'))),
      };
      return TradersService.tradersUpdateTrader(traderId, payload as any);
    },
    onSuccess: () => {
      setMessage('Trader updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-traders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-copy-summary'] });
    },
    onError: (e: any) => {
      setError(e?.message || 'Failed to update trader');
    },
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: 360, sm: 420 } } }}>
      <Box sx={{ p: 2, display: 'grid', gap: 2 }}>
        <Typography variant="h6" fontWeight={600}>Edit Trader</Typography>
        <Typography variant="body2" color="text.secondary">
          Update initial performance values. These appear on public cards and summaries.
        </Typography>
        <Divider />

        {traderQuery.isLoading ? (
          <Typography variant="body2" color="text.secondary">Loading...</Typography>
        ) : (
          <>
            <TextField
              label="Active Copy Relationships"
              type="number"
              value={totalCopiers}
              onChange={(e) => setTotalCopiers(e.target.value)}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="Assets Under Copy ($)"
              type="number"
              value={assetsUnderCopy}
              onChange={(e) => setAssetsUnderCopy(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
            <TextField
              label="Avg Monthly Return (%)"
              type="number"
              value={avgMonthlyReturn}
              onChange={(e) => setAvgMonthlyReturn(e.target.value)}
              inputProps={{ min: -100, max: 100, step: 0.01 }}
              fullWidth
            />

            {message && <Alert severity="success">{message}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={onClose} variant="text">Close</Button>
              <Button onClick={() => updateMutation.mutate()} variant="contained" disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </Stack>
          </>
        )}
      </Box>
    </Drawer>
  );
};

