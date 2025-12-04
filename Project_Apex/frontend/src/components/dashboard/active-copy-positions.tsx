import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  MoreVertOutlined,
  PlayArrowOutlined,
  PauseOutlined,
  StopOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CopyTradingService } from '@/api/services/CopyTradingService';
import type { CopiedTraderSummary } from '@/api/models/CopiedTraderSummary';
import { CopyStatus } from '@/api/models/CopyStatus';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatPercentage = (value: string) => `${value}`;

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

interface PositionActionMenuProps {
  status: CopyStatus;
  onAction: (action: 'pause' | 'resume' | 'stop' | 'reduce') => void;
}

const PositionActionMenu: React.FC<PositionActionMenuProps> = ({ status, onAction }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action: 'pause' | 'resume' | 'stop' | 'reduce') => {
    onAction(action);
    handleClose();
  };

  return (
    <>
      <Tooltip title="Manage position">
        <IconButton size="small" onClick={handleOpen}>
          <MoreVertOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {status === CopyStatus.ACTIVE && [
          <MenuItem key="pause" onClick={() => handleAction('pause')}>
            <PauseOutlined fontSize="small" sx={{ mr: 1 }} />
            Pause
          </MenuItem>,
          <MenuItem key="reduce" onClick={() => handleAction('reduce')}>
            Reduce Allocation
          </MenuItem>,
        ]}
        {status === CopyStatus.PAUSED && (
          <MenuItem onClick={() => handleAction('resume')}>
            <PlayArrowOutlined fontSize="small" sx={{ mr: 1 }} />
            Resume
          </MenuItem>
        )}
        {status !== CopyStatus.STOPPED && (
          <MenuItem onClick={() => handleAction('stop')} sx={{ color: 'error.main' }}>
            <StopOutlined fontSize="small" sx={{ mr: 1 }} />
            Stop Trading
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

interface ReduceAllocationDialogProps {
  open: boolean;
  copyId: string;
  currentAllocation: number;
  onClose: () => void;
  onSubmit: (copyId: string, amount: number) => void;
}

const ReduceAllocationDialog: React.FC<ReduceAllocationDialogProps> = ({
  open,
  copyId,
  currentAllocation,
  onClose,
  onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    const minAmount = Math.max(100, currentAllocation * 0.1);

    if (isNaN(numAmount)) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount < minAmount) {
      setError(`Minimum reduction is $${minAmount.toFixed(2)}`);
      return;
    }

    if (numAmount >= currentAllocation) {
      setError('Cannot reduce by total or more. Use Stop instead.');
      return;
    }

    setError('');
    onSubmit(copyId, numAmount);
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reduce Allocation</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current allocation: <strong>{formatCurrency(currentAllocation)}</strong>
        </Typography>
        <TextField
          fullWidth
          label="Reduction amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount to reduce"
          inputProps={{ step: '0.01', min: '0' }}
          error={Boolean(error)}
          helperText={
            error ||
            `Minimum: $${Math.max(100, currentAllocation * 0.1).toFixed(2)} (max 10% reduction)`
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!amount}
          color="primary"
        >
          Reduce
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ActiveCopyPositions: React.FC = () => {
  const queryClient = useQueryClient();
  const [reduceDialog, setReduceDialog] = useState<{
    open: boolean;
    copyId: string;
    allocation: number;
  }>({ open: false, copyId: '', allocation: 0 });

  // Fetch copied traders
  const copiedTradersQuery = useQuery({
    queryKey: ['copied-traders'],
    queryFn: () => CopyTradingService.copyTradingListCopiedTraders(0, 100),
  });

  // Pause mutation
  const pauseMutation = useMutation({
    mutationFn: (copyId: string) => CopyTradingService.copyTradingPauseCopyRelationship(copyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copied-traders'] });
    },
  });

  // Resume mutation
  const resumeMutation = useMutation({
    mutationFn: (copyId: string) => CopyTradingService.copyTradingResumeCopyRelationship(copyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copied-traders'] });
    },
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: (copyId: string) => CopyTradingService.copyTradingStopCopyRelationship(copyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copied-traders'] });
    },
  });

  const handleAction = (
    copyId: string,
    allocation: number,
    action: 'pause' | 'resume' | 'stop' | 'reduce'
  ) => {
    switch (action) {
      case 'pause':
        pauseMutation.mutate(copyId);
        break;
      case 'resume':
        resumeMutation.mutate(copyId);
        break;
      case 'stop':
        stopMutation.mutate(copyId);
        break;
      case 'reduce':
        setReduceDialog({ open: true, copyId, allocation });
        break;
    }
  };

  const handleReduceSubmit = (_copyId: string, _amount: number) => {
    // Call the reduce endpoint here once it's implemented
    // For now, just close the dialog and refetch
    setReduceDialog({ open: false, copyId: '', allocation: 0 });
    queryClient.invalidateQueries({ queryKey: ['copied-traders'] });
  };

  if (copiedTradersQuery.isLoading) {
    return (
      <Card sx={(theme) => ({ borderRadius: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`, background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.primary.main, 0.06)})`, boxShadow: `0 24px 60px -40px ${alpha(theme.palette.primary.main, 0.65)}` })}>
        <CardHeader title="Active Copy Trading Positions" />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (copiedTradersQuery.isError) {
    return (
      <Card sx={(theme) => ({ borderRadius: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`, background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.primary.main, 0.06)})`, boxShadow: `0 24px 60px -40px ${alpha(theme.palette.primary.main, 0.65)}` })}>
        <CardHeader title="Active Copy Trading Positions" />
        <CardContent>
          <Alert severity="error">Failed to load positions. Please try again.</Alert>
        </CardContent>
      </Card>
    );
  }

  const positions = copiedTradersQuery.data?.data || [];

  if (positions.length === 0) {
    return (
      <Card sx={(theme) => ({ borderRadius: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`, background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.primary.main, 0.06)})`, boxShadow: `0 24px 60px -40px ${alpha(theme.palette.primary.main, 0.65)}` })}>
        <CardHeader title="Active Copy Trading Positions" />
        <CardContent>
          <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
            You're not currently copying any traders. Browse traders to get started!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={(theme) => ({ borderRadius: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`, background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.primary.main, 0.06)})`, boxShadow: `0 24px 60px -40px ${alpha(theme.palette.primary.main, 0.65)}` })}>
        <CardHeader
          title="Active Copy Trading Positions"
          subheader={`${positions.length} active ${positions.length === 1 ? 'position' : 'positions'}`}
        />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell>Trader</TableCell>
                <TableCell align="right">Allocation</TableCell>
                <TableCell align="center">Risk Level</TableCell>
                <TableCell align="center">Performance</TableCell>
                <TableCell align="center">Win Rate</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.map((position: CopiedTraderSummary) => (
                <TableRow key={position.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {position.display_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {position.specialty}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatCurrency(position.allocation)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={position.risk_level || 'Medium'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                      {parseFloat(position.performance) >= 0 ? (
                        <TrendingUpOutlined sx={{ color: 'success.main', fontSize: 18 }} />
                      ) : (
                        <TrendingDownOutlined sx={{ color: 'error.main', fontSize: 18 }} />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: parseFloat(position.performance) >= 0 ? 'success.main' : 'error.main',
                        }}
                      >
                        {formatPercentage(position.performance)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{position.win_rate}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={getStatusLabel(position.status)}
                      color={getStatusColor(position.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <PositionActionMenu
                      status={position.status}
                      onAction={(action) =>
                        handleAction(position.id, position.allocation, action)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ReduceAllocationDialog
        open={reduceDialog.open}
        copyId={reduceDialog.copyId}
        currentAllocation={reduceDialog.allocation}
        onClose={() => setReduceDialog({ open: false, copyId: '', allocation: 0 })}
        onSubmit={handleReduceSubmit}
      />
    </>
  );
};
