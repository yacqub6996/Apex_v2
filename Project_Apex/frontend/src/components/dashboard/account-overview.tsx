import React, { useMemo, useState } from 'react';
import { Card, CardContent, Grid, Stack, Box, Typography, Chip, ButtonGroup, Button, Divider, CircularProgress, Alert, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { LineChart } from '@mui/x-charts/LineChart';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { RoiCalculationsService } from '@/api/services/RoiCalculationsService';
import { MoveFundsDrawer } from './move-funds-drawer';
import { useAuth } from '@/providers/auth-provider';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatPercentage = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

export const AccountOverview: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [roiPeriod, setRoiPeriod] = useState<'30D' | 'YTD' | 'SI'>('SI');
  const [moveFundsOpen, setMoveFundsOpen] = useState(false);
  const pendingQuery = useQuery({
    queryKey: ['pending-summary'],
    // No direct API for aggregated pending amounts in the new client; fall back to zeroes
    queryFn: async () => ({
      main_wallet_pending: 0,
      copy_trading_wallet_pending: 0,
      long_term_wallet_pending: 0,
    }),
  });

  // Calculate period_days parameter based on ROI period selection
  const getPeriodDays = (period: '30D' | 'YTD' | 'SI'): number | null => {
    switch (period) {
      case '30D':
        return 30;
      case 'YTD':
        return -1; // Special value for YTD
      case 'SI':
        return null; // Since inception
      default:
        return null;
    }
  };

  // Fetch ROI data based on selected period
  const roiQuery = useQuery({
    queryKey: ['unified-roi', roiPeriod],
    queryFn: () => {
      const days = getPeriodDays(roiPeriod);
      return RoiCalculationsService.roiCalculationsGetUnifiedRoi(days === null ? undefined : days);
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const getHistoricalDays = (period: '30D' | 'YTD' | 'SI') => {
    if (period === '30D') return 30;
    if (period === 'YTD') return 365;
    return 180; // since inception fallback
  };

  const historicalRoiQuery = useQuery({
    queryKey: ['historical-roi', roiPeriod],
    queryFn: () => RoiCalculationsService.roiCalculationsGetHistoricalRoi(getHistoricalDays(roiPeriod)),
    staleTime: 60000,
  });

  const balances = useMemo(() => {
    const wallet = Number((user as any)?.wallet_balance ?? user?.availableBalance ?? 0);
    const copyWallet = Number((user as any)?.copy_trading_wallet_balance ?? 0);
    const longTermWallet = Number((user as any)?.long_term_wallet_balance ?? 0);
    const transferableNow = wallet; // main wallet only - immediately available funds
    const copyAllocated = Number((user as any)?.copy_trading_balance ?? user?.allocatedCopyBalance ?? 0);
    const longTermAllocated = Number((user as any)?.long_term_balance ?? user?.longTermBalance ?? 0);
    const activelyInvested = copyAllocated + longTermAllocated; // all allocations
    const grandTotal = wallet + copyWallet + longTermWallet + activelyInvested; // all balances and allocations
    const total = grandTotal; // use grand total for percentage calculations
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return {
      wallet,
      copyWallet,
      longTermWallet,
      total,
      transferableNow,
      activelyInvested,
      grandTotal,
      pctWallet: pct(wallet),
      pctCopy: pct(copyWallet),
      pctLong: pct(longTermWallet),
    };
  }, [user]);

  const allocationSlices = useMemo(() => {
    const slices = [
      { id: 'Main wallet', value: balances.wallet, color: theme.palette.primary.main },
      { id: 'Copy trading', value: balances.copyWallet, color: theme.palette.success.main },
      { id: 'Long-term', value: balances.longTermWallet, color: theme.palette.warning.main },
      { id: 'Allocated', value: balances.activelyInvested, color: theme.palette.info.main },
    ];
    const hasValue = slices.some((s) => s.value > 0);
    return hasValue ? slices : slices.map((s, idx) => ({ ...s, value: idx === 0 ? 1 : 0 }));
  }, [balances.activelyInvested, balances.copyWallet, balances.longTermWallet, balances.wallet, theme.palette.info.main, theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main]);

  const pieInnerRadius = isMobile ? 36 : 55;
  const pieOuterRadius = isMobile ? 60 : 90;
  const pieHeight = isMobile ? 170 : 260;

  const historicalDataset = useMemo(() => {
    const data = historicalRoiQuery.data ?? [];
    if (data.length) return data;
    const now = Date.now();
    return Array.from({ length: 7 }).map((_, idx) => ({
      date: new Date(now - (6 - idx) * 24 * 60 * 60 * 1000).toISOString(),
      portfolio_value: balances.grandTotal,
      roi_percentage: 0,
      daily_profit_loss: 0,
    }));
  }, [balances.grandTotal, historicalRoiQuery.data]);

  const performanceDataset = useMemo(() => {
    return historicalDataset.map((entry) => ({
      time: new Date(entry.date).getTime(),
      value: Number(entry.portfolio_value),
      roi: Number(entry.roi_percentage),
      pnl: Number(entry.daily_profit_loss),
    }));
  }, [historicalDataset]);





  const Stat = ({
    title,
    value,
    colorKey = 'primary',
    action,
  }: {
    title: string;
    value: number;
    colorKey?: 'primary' | 'success' | 'warning' | 'info';
    action?: React.ReactNode;
  }) => (
    <Card variant="outlined" sx={{ borderRadius: 2.5, height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography variant="h6" fontWeight={700} sx={{ color: `${colorKey}.main` }}>{formatCurrency(value)}</Typography>
        {action}
      </CardContent>
    </Card>
  );

  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Transferable Now</Typography>
                <Typography variant="h5" fontWeight={800}>{formatCurrency(balances.transferableNow)}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Actively Invested</Typography>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="h5" fontWeight={800}>{formatCurrency(balances.activelyInvested)}</Typography>
                  {roiQuery.isLoading && (
                    <Chip
                      size="small"
                      label={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <CircularProgress size={12} />
                          <span>Loading...</span>
                        </Stack>
                      }
                      color="default"
                      variant="outlined"
                    />
                  )}
                  {roiQuery.isError && (
                    <Chip size="small" label="Error loading ROI" color="error" variant="outlined" />
                  )}
                  {roiQuery.isSuccess && roiQuery.data && (
                    <Chip
                      size="small"
                      label={`ROI (${roiPeriod}): ${formatPercentage(roiQuery.data.overall_roi_percentage)}`}
                      color={roiQuery.data.overall_roi_percentage >= 0 ? "success" : "error"}
                      variant="outlined"
                    />
                  )}
                  {!roiQuery.isLoading && !roiQuery.isError && !roiQuery.isSuccess && (
                    <Chip size="small" label={`ROI (${roiPeriod}): -- %`} color="default" variant="outlined" />
                  )}
                </Stack>
                {roiQuery.isSuccess && roiQuery.data && (
                  <Typography variant="caption" color={roiQuery.data.overall_roi_percentage >= 0 ? "success.main" : "error.main"}>
                    Total Equity: {formatCurrency(roiQuery.data.total_equity)}
                  </Typography>
                )}
              </Box>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Typography variant="caption" color="text.secondary">ROI Period</Typography>
              <ButtonGroup size="small" variant="outlined" aria-label="Global ROI period selector">
                <Button onClick={() => setRoiPeriod('30D')} variant={roiPeriod === '30D' ? 'contained' : 'outlined'}>30D</Button>
                <Button onClick={() => setRoiPeriod('YTD')} variant={roiPeriod === 'YTD' ? 'contained' : 'outlined'}>YTD</Button>
                <Button onClick={() => setRoiPeriod('SI')} variant={roiPeriod === 'SI' ? 'contained' : 'outlined'}>SI</Button>
              </ButtonGroup>
            </Stack>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">Grand Total</Typography>
            <Typography variant="subtitle1" color="text.secondary" fontWeight={700}>{formatCurrency(balances.grandTotal)}</Typography>
            <Chip size="small" variant="outlined" label="Not fully withdrawable" />
            <Button variant="outlined" onClick={() => setMoveFundsOpen(true)} sx={{ ml: 'auto' }}>Move Funds</Button>
          </Stack>
        </CardContent>
      </Card>

      {roiQuery.isError && (
        <Alert severity="error" sx={{ mb: -1 }}>
          Failed to load ROI data. Please try again later.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: 1, md: 2 } }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Allocation mix
              </Typography>
              <Box sx={{ width: { xs: 200, md: '100%' }, mx: 'auto' }}>
                <PieChart
                  height={pieHeight}
                  margin={{ top: 8, bottom: 8, left: 0, right: 0 }}
                  series={[{
                    data: allocationSlices.map((slice) => ({
                      id: slice.id,
                      value: slice.value,
                      label: isMobile ? '' : slice.id,
                      color: slice.color,
                    })),
                    innerRadius: pieInnerRadius,
                    outerRadius: pieOuterRadius,
                    cornerRadius: 4,
                    paddingAngle: 2,
                  }]}
                />
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} flexWrap="wrap">
                {allocationSlices.map((slice) => (
                  <Chip key={slice.id} size="small" label={`${slice.id}`} sx={{ backgroundColor: alpha(slice.color, 0.08), color: slice.color }} />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }} sx={{ order: { xs: 2, md: 1 } }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Performance trend
              </Typography>
              <LineChart
                dataset={performanceDataset}
                height={isMobile ? 190 : 280}
                margin={{ left: 28, right: 12, top: 12, bottom: 24 }}
                grid={{ horizontal: true, vertical: false }}
                xAxis={[{
                  dataKey: 'time',
                  scaleType: 'time',
                  valueFormatter: (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  tickLabelStyle: { fill: theme.palette.text.secondary },
                }]}
                yAxis={[{ tickLabelStyle: { fill: theme.palette.text.secondary } }]}
                series={[{
                  dataKey: 'value',
                  label: 'Portfolio value',
                  area: true,
                  curve: 'catmullRom',
                  color: theme.palette.primary.main,
                  showMark: false,
                  valueFormatter: (v) => formatCurrency(Number(v)),
                }]}
                sx={{
                  '& .MuiAreaElement-root': { fillOpacity: 0.16 },
                  '& .MuiLineElement-root': { strokeWidth: 2.4 },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Portfolio value</Typography>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: theme.palette.primary.main }}>
                {formatCurrency(performanceDataset[performanceDataset.length - 1]?.value ?? 0)}
              </Typography>
              <SparkLineChart
                data={performanceDataset.map((entry) => entry.value)}
                height={60}
                curve="natural"
                color={theme.palette.primary.main}
                valueFormatter={(v) => formatCurrency(Number(v))}
                showHighlight
                showTooltip
                margin={{ left: 4, right: 4, top: 6, bottom: 6 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stat title="Main Wallet" value={balances.wallet} colorKey="primary" action={<>
            {pendingQuery.data && (pendingQuery.data as any).main_wallet_pending > 0 && (
              <Typography variant="caption" color="text.secondary">Pending −{formatCurrency((pendingQuery.data as any).main_wallet_pending)}</Typography>
            )}
            <Button size="small" sx={{ mt: 1 }} variant="outlined" onClick={() => setMoveFundsOpen(true)}>Move</Button>
          </>} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stat title="Copy Trading Wallet" value={balances.copyWallet} colorKey="success" action={<>
            {pendingQuery.data && (pendingQuery.data as any).copy_trading_wallet_pending > 0 && (
              <Typography variant="caption" color="text.secondary">Pending −{formatCurrency((pendingQuery.data as any).copy_trading_wallet_pending)}</Typography>
            )}
            <Button size="small" sx={{ mt: 1 }} variant="outlined" onClick={() => setMoveFundsOpen(true)}>Move</Button>
          </>} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stat title="Long-Term Wallet" value={balances.longTermWallet} colorKey="warning" action={<>
            {pendingQuery.data && (pendingQuery.data as any).long_term_wallet_pending > 0 && (
              <Typography variant="caption" color="text.secondary">Pending −{formatCurrency((pendingQuery.data as any).long_term_wallet_pending)}</Typography>
            )}
            <Button size="small" sx={{ mt: 1 }} variant="outlined" onClick={() => setMoveFundsOpen(true)}>Move</Button>
          </>} />
        </Grid>
      </Grid>

      <MoveFundsDrawer open={moveFundsOpen} onClose={() => setMoveFundsOpen(false)} />
    </Stack>
  );
};
