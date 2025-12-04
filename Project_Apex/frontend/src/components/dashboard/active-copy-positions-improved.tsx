import React, { useState } from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  PlayArrowOutlined,
  PauseOutlined,
  StopOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  RemoveCircleOutlineOutlined,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CopyTradingService } from '@/api/services/CopyTradingService';
import type { CopyTradingSummaryResponse } from '@/api/models/CopyTradingSummaryResponse';
import type { CopyTradingPositionSummary } from '@/api/models/CopyTradingPositionSummary';
import { CopyStatus } from '@/api/models/CopyStatus';
import { Panel } from '@/components/shared/panel';
import { ActionsMenu, type ActionMenuItem } from '@/components/shared/actions-menu';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const getStatusColor = (status: CopyStatus): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case CopyStatus.ACTIVE:
      return 'success';
    case CopyStatus.PAUSED:
      return 'warning';
    case CopyStatus.STOPPED:
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: CopyStatus): string => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

export const ActiveCopyPositionsImproved: React.FC = () => {
  const [confirmStopDialog, setConfirmStopDialog] = useState<{
    open: boolean;
    copyId: string;
    traderName: string;
  }>({ open: false, copyId: '', traderName: '' });
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  // Fetch copy-trading summary (per-position performance + allocation)
  const summaryQuery = useQuery<CopyTradingSummaryResponse>({
    queryKey: ['copy-trading-summary'],
    queryFn: () => CopyTradingService.copyTradingGetCopyTradingSummary(),
  });

  // Helper to apply highlight animation after successful mutation
  const applyHighlight = async (copyId: string) => {
    await summaryQuery.refetch();
    requestAnimationFrame(() => {
      setHighlightedRowId(copyId);
      setTimeout(() => setHighlightedRowId(null), 600);
    });
  };

  // Pause mutation
  const pauseMutation = useMutation({
    mutationFn: (copyId: string) => CopyTradingService.copyTradingPauseCopyRelationship(copyId),
    onSuccess: async (_data, copyId) => {
      await applyHighlight(copyId);
    },
  });

  // Resume mutation
  const resumeMutation = useMutation({
    mutationFn: (copyId: string) => CopyTradingService.copyTradingResumeCopyRelationship(copyId),
    onSuccess: async (_data, copyId) => {
      await applyHighlight(copyId);
    },
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: (copyId: string) => CopyTradingService.copyTradingStopCopyRelationship(copyId),
    onSuccess: async (_data, copyId) => {
      await applyHighlight(copyId);
    },
  });

  const handleAction = (
    copyId: string,
    _status: CopyStatus,
    action: 'pause' | 'resume' | 'stop' | 'reduce',
    traderName?: string
  ) => {
    switch (action) {
      case 'pause':
        pauseMutation.mutate(copyId);
        break;
      case 'resume':
        resumeMutation.mutate(copyId);
        break;
      case 'stop':
        setConfirmStopDialog({ open: true, copyId, traderName: traderName || '' });
        break;
      case 'reduce':
        // TODO: Implement reduce allocation functionality (e.g., open a dialog or inline form for copyId)
        console.log('Reduce allocation for', copyId);
        break;
    }
  };

  const handleConfirmStop = () => {
    if (confirmStopDialog.copyId) {
      stopMutation.mutate(confirmStopDialog.copyId);
      setConfirmStopDialog({ open: false, copyId: '', traderName: '' });
    }
  };

  const handleCancelStop = () => {
    setConfirmStopDialog({ open: false, copyId: '', traderName: '' });
  };

  const positions: CopyTradingPositionSummary[] = summaryQuery.data?.positions ?? [];
  const visiblePositions = positions.filter(
    (position) => position.status !== CopyStatus.STOPPED,
  );

  if (summaryQuery.isError) {
    return (
      <Panel title="Active Copy Trading Positions">
        <Alert severity="error">Failed to load positions. Please try again.</Alert>
      </Panel>
    );
  }

  return (
    <>
      <Panel
        title="Active Copy Trading Positions"
        subtitle={
          visiblePositions.length > 0
            ? `${visiblePositions.length} active ${visiblePositions.length === 1 ? 'position' : 'positions'}`
            : undefined
        }
      >
        {summaryQuery.isLoading ? (
          <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading copy trading positions...
            </Typography>
          </Box>
        ) : visiblePositions.length === 0 ? (
          <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              You're not currently copying any traders. Browse traders to get started!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box
              sx={{
                minWidth: 760,
                borderRadius: 2,
                border: 'none',
                boxShadow: (theme) => theme.shadows[1],
                bgcolor: 'background.paper',
                transition: 'box-shadow 0.12s ease-in-out',
                '&:hover': {
                  boxShadow: (theme) => theme.shadows[4],
                },
                '@media (max-width: 599px)': {
                  minWidth: 'auto',
                  overflowX: 'visible',
                  '& > .header-grid': {
                    display: 'none',
                  },
                  '& .grid-row': {
                    display: 'flex',
                    flexDirection: 'column',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    mb: 2,
                    p: 2,
                  },
                  '& .grid-cell': {
                    display: 'block',
                    py: 1,
                    '&::before': {
                      content: 'attr(data-label)',
                      fontWeight: 600,
                      display: 'inline-block',
                      width: '120px',
                      color: 'text.secondary',
                    },
                  },
                },
              }}
            >
              <Box
                className="header-grid"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gap: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  boxShadow: '0px 1px 3px rgba(0,0,0,0.04)',
                  px: 3,
                  py: 1.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    gridColumn: 'span 4',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  Trader
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    gridColumn: 'span 2',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  Allocation
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    gridColumn: 'span 2',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  Performance
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    gridColumn: 'span 2',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  Win Rate
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    gridColumn: 'span 1',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    textAlign: 'center',
                  }}
                >
                  Status
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    gridColumn: 'span 1',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    textAlign: 'center',
                  }}
                >
                  Actions
                </Typography>
              </Box>
              <Box sx={{ '& > *:not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }}>
                {visiblePositions.map((row: CopyTradingPositionSummary) => {
                  const perfValue = Number.isFinite(row.total_profit) ? row.total_profit : 0;
                  const isPositive = perfValue > 0;
                  const isNegative = perfValue < 0;

                  const actions: ActionMenuItem[] = [];
                  if (row.status === CopyStatus.ACTIVE) {
                    actions.push({
                      id: 'pause',
                      label: 'Pause',
                      icon: PauseOutlined,
                      onClick: () => handleAction(row.id, row.status, 'pause', row.display_name),
                    });
                    actions.push({
                      id: 'reduce',
                      label: 'Reduce Allocation',
                      icon: RemoveCircleOutlineOutlined,
                      onClick: () => handleAction(row.id, row.status, 'reduce', row.display_name),
                    });
                  }
                  if (row.status === CopyStatus.PAUSED) {
                    actions.push({
                      id: 'resume',
                      label: 'Resume',
                      icon: PlayArrowOutlined,
                      onClick: () => handleAction(row.id, row.status, 'resume', row.display_name),
                    });
                  }
                  if (row.status !== CopyStatus.STOPPED) {
                    actions.push({
                      id: 'stop',
                      label: 'Stop Trading',
                      icon: StopOutlined,
                      onClick: () => handleAction(row.id, row.status, 'stop', row.display_name),
                      destructive: true,
                      divider: true,
                    });
                  }

                  return (
                    <Box
                      key={row.id}
                      className="grid-row"
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(12, 1fr)',
                        alignItems: 'center',
                        gap: 2,
                        px: 3,
                        py: 1.5,
                        transition: 'background-color 0.15s ease-in-out',
                        bgcolor: highlightedRowId === row.id ? 'action.hover' : 'transparent',
                      }}
                    >
                      <Box
                        className="grid-cell"
                        data-label="Trader"
                        sx={{ gridColumn: 'span 4' }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.display_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.specialty}
                        </Typography>
                      </Box>
                      <Box
                        className="grid-cell"
                        data-label="Allocation"
                        sx={{ gridColumn: 'span 2' }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatCurrency(row.allocation)}
                        </Typography>
                      </Box>
                      <Box
                        className="grid-cell"
                        data-label="Performance"
                        sx={{ gridColumn: 'span 2' }}
                      >
                        <Stack
                          direction="row"
                          spacing={0.5}
                          justifyContent="flex-start"
                          alignItems="center"
                        >
                          {isPositive && (
                            <TrendingUpOutlined sx={{ color: 'success.main', fontSize: 18 }} />
                          )}
                          {isNegative && (
                            <TrendingDownOutlined sx={{ color: 'error.main', fontSize: 18 }} />
                          )}
                          {!isPositive && !isNegative && (
                            <TrendingDownOutlined
                              sx={{ color: 'text.disabled', fontSize: 18 }}
                            />
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              color: perfValue >= 0 ? 'success.main' : 'error.main',
                            }}
                          >
                            {formatCurrency(row.total_profit)}{" "}
                            {typeof row.roi_percentage === "number"
                              ? `(${row.roi_percentage.toFixed(2)}%)`
                              : ""}
                          </Typography>
                        </Stack>
                      </Box>
                      <Box
                        className="grid-cell"
                        data-label="Win Rate"
                        sx={{ gridColumn: 'span 2' }}
                      >
                        <Typography variant="body2">
                          {row.session_trade_count > 0
                            ? `${row.session_win_rate.toFixed(2)}% over ${row.session_trade_count} trades`
                            : "No trades yet"}
                        </Typography>
                      </Box>
                      <Box
                        className="grid-cell"
                        data-label="Status"
                        sx={{ gridColumn: 'span 1', textAlign: 'center' }}
                      >
                        <Chip
                          label={getStatusLabel(row.status)}
                          color={getStatusColor(row.status)}
                          size="small"
                          aria-label={`Status: ${getStatusLabel(row.status)}`}
                        />
                      </Box>
                      <Box
                        className="grid-cell"
                        data-label="Actions"
                        sx={{ gridColumn: 'span 1', textAlign: 'center' }}
                      >
                        <ActionsMenu
                          actions={actions}
                          ariaLabel={`Actions for ${row.display_name}`}
                          size="medium"
                          menuProps={{
                            slotProps: {
                              paper: {
                                sx: { minWidth: 200 },
                              },
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}
      </Panel>

      {/* Stop Confirmation Dialog */}
      <Dialog
        open={confirmStopDialog.open}
        onClose={handleCancelStop}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Stop Copy Trading</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to stop copying <strong>{confirmStopDialog.traderName}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will permanently end this copy relationship. All funds from this copy position (allocation plus any PnL) will be returned to your Copy Trading Wallet.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelStop} sx={{ minHeight: 44 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmStop}
            variant="contained"
            color="error"
            disabled={stopMutation.isPending}
            sx={{ minHeight: 44 }}
          >
            {stopMutation.isPending ? 'Stopping...' : 'Stop Trading'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
