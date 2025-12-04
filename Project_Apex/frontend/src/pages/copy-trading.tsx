import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Box,
  Button,
  TextField,
  Chip,
  Avatar,
  Typography,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/providers/auth-provider";
import { toAbsoluteResource } from "@/utils/url";
import { CopyTradingService } from "@/api/services/CopyTradingService";
import type { CopiedTraderSummary } from "@/api/models/CopiedTraderSummary";
import type { CopyTradingStartResponse } from "@/api/models/CopyTradingStartResponse";
import type { CopyTradingUpdateResponse } from "@/api/models/CopyTradingUpdateResponse";
import type { TraderVerificationResponse } from "@/api/models/TraderVerificationResponse";
import type { CopyStatus } from "@/api/models/CopyStatus";
import type { RiskTolerance } from "@/api/models/RiskTolerance";
import type { CopyTradingStartRequest } from "@/api/models/CopyTradingStartRequest";
import type { TraderVerificationRequest } from "@/api/models/TraderVerificationRequest";
import PeopleIcon from "@mui/icons-material/People";
import { CopyTradingService as CopyTradingApi } from "@/api/services/CopyTradingService";
import type { FundWalletResponse } from "@/api/models/FundWalletResponse";
import type { CopyTradingSummaryResponse } from "@/api/models/CopyTradingSummaryResponse";
import { toast } from "react-toastify";
import { MoveFundsDrawer } from "@/components/dashboard/move-funds-drawer";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const getRiskColor = (riskLevel: RiskTolerance | "LOW" | "MEDIUM" | "HIGH") => {
  switch (riskLevel) {
    case "LOW":
      return "success" as const;
    case "MEDIUM":
      return "warning" as const;
    case "HIGH":
      return "error" as const;
    default:
      return "primary" as const;
  }
};

const getStatusColor = (status: CopyStatus) => {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "PAUSED":
      return "warning" as const;
    case "STOPPED":
      return "error" as const;
    default:
      return "default" as const;
  }
};

export const CopyTrading = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [traderCode, setTraderCode] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [moveFundsOpen, setMoveFundsOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<TraderVerificationResponse | null>(null);
  const [showExecutions, setShowExecutions] = useState(false);
  const [confirmStop, setConfirmStop] = useState<{ open: boolean; copyId: string | null; allocation: number }>({ open: false, copyId: null, allocation: 0 });

  const invalidateDashboardQueries = () => {
    if (!user?.id) {
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['account-summary', user.id] });
    queryClient.invalidateQueries({ queryKey: ['trades', user.id] });
    queryClient.invalidateQueries({ queryKey: ['daily-performance', user.id] });
    queryClient.invalidateQueries({ queryKey: ['transactions', user.id] });
    queryClient.invalidateQueries({ queryKey: ['market-prices'] });
    queryClient.invalidateQueries({ queryKey: ['execution-feed'] });
    queryClient.invalidateQueries({ queryKey: ["copy-trading-summary"] });
};

const FundCopyWallet = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidateBalances = () => {
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    queryClient.invalidateQueries({ queryKey: ["users-me"] });
    queryClient.invalidateQueries({ queryKey: ["account-summary", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["copy-trading-summary"] });
  };

  const fundMutation = useMutation<FundWalletResponse, Error, number>({
    mutationFn: (amt: number) => CopyTradingApi.copyTradingFundWallet({ amount: amt }),
    onSuccess: () => {
      setAmount("");
      invalidateBalances();
    },
    onError: (e) => {
      setError(e.message);
    },
  });

  const handleFund = () => {
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid positive amount");
      return;
    }
    fundMutation.mutate(amt);
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'primary.main' }}>
          Amount
        </Typography>
        <TextField
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          variant="outlined"
          fullWidth
        />
      </Box>
      <Button
        onClick={handleFund}
        fullWidth
        variant="contained"
        disabled={fundMutation.isPending}
        aria-busy={fundMutation.isPending || undefined}
      >
        Fund
      </Button>
      {error && (
        <Typography variant="body2" color="error.main">
          {error}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        Wallet: {formatCurrency(user?.availableBalance ?? user?.balance ?? 0)}
      </Typography>
    </Stack>
  );
};

  const invalidateCopyTradingState = () => {
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    queryClient.invalidateQueries({ queryKey: ["copy-trading-summary"] });
    queryClient.invalidateQueries({ queryKey: ["copied-traders"] });
    invalidateDashboardQueries();
  };

  const copiedTradersQuery = useQuery<CopiedTraderSummary[]>({
    queryKey: ["copied-traders"],
    queryFn: async () => {
      const res = await CopyTradingService.copyTradingListCopiedTraders(0, 100);
      return res.data;
    },
  });

  const copySummaryQuery = useQuery<CopyTradingSummaryResponse>({
    queryKey: ["copy-trading-summary"],
    queryFn: () => CopyTradingService.copyTradingGetCopyTradingSummary(),
  });

  const copyExecutionsQuery = useQuery({
    queryKey: ["copy-trading-history-preview"],
    queryFn: () => CopyTradingService.copyTradingGetCopyTradingHistory(1, 25),
  });

  const verifyTraderMutation = useMutation<TraderVerificationResponse, Error, string>({
    mutationFn: (code) => CopyTradingService.copyTradingVerifyTraderCode({ trader_code: code } as TraderVerificationRequest),
    onSuccess: (data) => {
      if (data.valid && data.trader) {
        setVerificationResult(data);
      } else {
        setVerificationResult(null);
        toast.error(data.message ?? "Trader code not found. Please verify and try again.");
      }
    },
    onError: (error) => {
      setVerificationResult(null);
      toast.error(error.message || "Failed to verify trader code. Please try again.");
    },
  });

  const startCopyTradingMutation = useMutation<
    CopyTradingStartResponse,
    Error,
    { traderId: string; amount: number }
  >({
    mutationFn: ({ traderId, amount }) =>
      CopyTradingService.copyTradingStartCopyTrading({ trader_id: traderId, allocation_amount: amount } as CopyTradingStartRequest),
    onSuccess: (data) => {
      const next = data.available_balance ?? 0;
      toast.success(`${data.message} Remaining balance: ${formatCurrency(next)}.`);
      setTraderCode("");
      setAllocationAmount("");
      setVerificationResult(null);
      invalidateCopyTradingState();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start copy trading. Please try again.");
    },
  });

  const handleVerifyTrader = () => {
    if (!traderCode.trim()) {
      toast.error("Please enter a trader code");
      return;
    }

    verifyTraderMutation.mutate(traderCode.trim().toUpperCase());
  };

  const handleStartCopyTrading = () => {
    if (!verificationResult?.valid || !verificationResult.trader) {
      toast.error("Please verify a valid trader code before starting copy trading");
      return;
    }

    const amount = parseFloat(allocationAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid allocation amount");
      return;
    }

    const copyWallet = typeof user?.copy_trading_wallet_balance === 'number' ? user.copy_trading_wallet_balance : 0;
    if (amount > copyWallet) {
      toast.error("Allocation amount exceeds your Copy Trading Wallet balance");
      return;
    }

    startCopyTradingMutation.mutate({
      traderId: verificationResult.trader.id,
      amount,
    });
  };

  const copiedTraders = Array.isArray(copiedTradersQuery.data) ? copiedTradersQuery.data : [];

  const summaryPositions = copySummaryQuery.data?.positions ?? [];
  const visibleTraders = (summaryPositions.length > 0 ? summaryPositions : copiedTraders).filter(
    (entry) => entry.status !== "STOPPED",
  );

  const activeCopyCount =
    copySummaryQuery.data?.active_positions ?? visibleTraders.filter((entry) => entry.status === "ACTIVE").length;
  const pausedCopyCount =
    copySummaryQuery.data?.paused_positions ?? visibleTraders.filter((entry) => entry.status === "PAUSED").length;

  const activeTradingBalance =
    typeof copySummaryQuery.data?.total_allocation === "number"
      ? copySummaryQuery.data.total_allocation
      : (user as any)?.allocatedCopyBalance ?? (user as any)?.copy_trading_balance ?? 0;

  const pauseCopyMutation = useMutation<
    CopyTradingUpdateResponse,
    Error,
    string
  >({
    mutationFn: (copyId) => CopyTradingService.copyTradingPauseCopyRelationship(copyId),
    onSuccess: (data) => {
      const next = data.available_balance ?? 0;
      toast.success(`${data.message} Updated balance: ${formatCurrency(next)}.`);
      invalidateCopyTradingState();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to pause copy trading relationship.");
    },
  });

  const stopCopyMutation = useMutation<
    CopyTradingUpdateResponse,
    Error,
    { copyId: string; allocation: number }
  >({
    mutationFn: ({ copyId }) => CopyTradingService.copyTradingStopCopyRelationship(copyId),
    onSuccess: (data) => {
      const next = data.available_balance ?? 0;
      toast.success(`${data.message} Updated balance: ${formatCurrency(next)}.`);
      invalidateCopyTradingState();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to stop copy trading relationship.");
    },
  });


  const handlePauseCopy = (copyId: string) => {
    pauseCopyMutation.mutate(copyId);
  };

  const handleStopCopy = (copyId: string) => {
    const copy = (copiedTraders ?? []).find((c) => c.copy_id === copyId);
    const allocation = copy?.allocation ?? 0;
    setConfirmStop({ open: true, copyId, allocation });
  };

  const handleConfirmStopClose = () => {
    setConfirmStop({ open: false, copyId: null, allocation: 0 });
  };

  const handleConfirmStopProceed = () => {
    if (confirmStop.copyId) {
      stopCopyMutation.mutate({ copyId: confirmStop.copyId, allocation: confirmStop.allocation });
    }
    handleConfirmStopClose();
  };

  const resumeCopyMutation = useMutation<
    CopyTradingUpdateResponse,
    Error,
    string
  >({
    mutationFn: (copyId) => CopyTradingService.copyTradingResumeCopyRelationship(copyId),
    onSuccess: (data) => {
      const next = data.available_balance ?? 0;
      toast.success(`${data.message} Updated balance: ${formatCurrency(next)}.`);
      invalidateCopyTradingState();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resume copy trading relationship.");
    },
  });

  const handleResumeCopy = (copyId: string) => {
    resumeCopyMutation.mutate(copyId);
  };

  // use shared helper for absolute resource URLs

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Primary Header Section - Balance Display */}
      <Box
        sx={{
          borderRadius: 2,
          border: "none",
          boxShadow: (theme) => theme.shadows[1],
          bgcolor: 'background.paper',
          p: 3,
          transition: "box-shadow 0.12s ease-in-out",
          '&:hover': {
            boxShadow: (theme) => theme.shadows[4],
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            alignItems: { lg: 'center' },
            justifyContent: { lg: 'space-between' },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Copy Trading
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Copy professional traders to actively grow your portfolio
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 3 },
              alignItems: { sm: 'center' },
            }}
          >
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="body2" color="text.secondary">
                Copy Trading Wallet
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {formatCurrency(
                  typeof user?.copy_trading_wallet_balance === "number"
                    ? user.copy_trading_wallet_balance
                    : 0,
                )}
              </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="body2" color="text.secondary">
                Active Copy Allocation
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {formatCurrency(activeTradingBalance)}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              onClick={() => setMoveFundsOpen(true)}
            >
              Transfer Funds
            </Button>
          </Box>
        </Box>
      </Box>


      {/* Main Content Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 3,
        }}
      >
        {/* Left Column - Primary Actions (60% width) */}
        <Stack spacing={3}>
          {/* Active Copy Relationships Card */}
          <Box
            sx={{
              borderRadius: 2,
              border: "none",
              boxShadow: (theme) => theme.shadows[1],
              bgcolor: 'background.paper',
              p: 3,
              transition: "box-shadow 0.12s ease-in-out",
              '&:hover': {
                boxShadow: (theme) => theme.shadows[4],
              },
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Active Copy Relationships
                </Typography>
                {activeCopyCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {activeCopyCount} Active
                    </Typography>
                  </Box>
                )}
              </Box>
              {pausedCopyCount > 0 && (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip label={`Paused: ${pausedCopyCount}`} color="warning" size="small" />
                </Box>
              )}
            </Box>

            {copiedTradersQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Box
                  sx={{
                    animation: 'spin 1s linear infinite',
                    borderRadius: '50%',
                    borderBottom: 2,
                    borderColor: 'primary.main',
                    width: 24,
                    height: 24,
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </Box>
            ) : visibleTraders.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  You're not copying any traders yet
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Start by entering a trader code below
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {visibleTraders.map((trader) => (
                  <motion.div
                    key={trader.copy_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Box
                      sx={{
                        borderRadius: 2,
                        border: "none",
                        boxShadow: (theme) => theme.shadows[1],
                        p: 2,
                        transition: 'box-shadow 0.12s ease-in-out',
                        '&:hover': {
                          boxShadow: (theme) => theme.shadows[4],
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Avatar
                              src={toAbsoluteResource(trader.avatar_url ?? undefined)}
                              sx={{ width: 32, height: 32 }}
                            >
                              {trader.displayName?.split(' ').slice(0,2).map(p=>p.charAt(0).toUpperCase()).join('') || 'T'}
                            </Avatar>
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {trader.displayName}
                            </Typography>
                            <Chip label={trader.risk_level} color={getRiskColor(trader.risk_level)} size="small" />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {trader.specialty}
                          </Typography>
                          
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                              gap: 2,
                              mb: 2,
                            }}
                          >
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Your Allocation
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatCurrency(trader.allocation)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Copy Equity
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatCurrency(
                                  (trader.allocation ?? 0) +
                                    (typeof (trader as any).total_profit === "number"
                                      ? (trader as any).total_profit
                                      : 0),
                                )}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Copy PnL
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 500,
                                  color:
                                    typeof (trader as any).total_profit === "number"
                                      ? (trader as any).total_profit >= 0
                                        ? 'success.main'
                                        : 'error.main'
                                      : 'text.secondary',
                                }}
                              >
                                {typeof (trader as any).total_profit === "number"
                                  ? `${formatCurrency((trader as any).total_profit)}${
                                      typeof (trader as any).roi_percentage === "number"
                                        ? ` · ${(trader as any).roi_percentage.toFixed(2)}%`
                                        : ""
                                    }`
                                  : "No copy PnL yet"}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              {typeof (trader as any).session_trade_count === "number"
                                ? `Win Rate: ${(trader as any).session_win_rate?.toFixed(2) ?? "0.00"}% over ${(trader as any).session_trade_count} trades`
                                : `Win Rate: ${trader.winRate}`}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Code: {trader.traderCode}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => navigator.clipboard.writeText(trader.traderCode)}
                                sx={{ p: 0.5 }}
                              >
                                📋
                              </IconButton>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                      
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          pt: 2,
                          borderTop: 1,
                          borderColor: 'divider',
                          boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
                        }}
                      >
                        <Chip label={trader.status} color={getStatusColor(trader.status)} size="small" />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                        {trader.status === "ACTIVE" && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handlePauseCopy(trader.copy_id)}
                            disabled={pauseCopyMutation.isPending}
                            aria-busy={pauseCopyMutation.isPending || undefined}
                          >
                            Pause
                          </Button>
                        )}
                        {trader.status === "PAUSED" && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleResumeCopy(trader.copy_id)}
                            disabled={resumeCopyMutation.isPending}
                            aria-busy={resumeCopyMutation.isPending || undefined}
                          >
                            Resume
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleStopCopy(trader.copy_id)}
                          disabled={trader.status === "STOPPED" || stopCopyMutation.isPending}
                          aria-busy={stopCopyMutation.isPending || undefined}
                        >
                          Stop
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                  </motion.div>
                ))}
              </Stack>
            )}
          </Box>

          {/* Start New Copy Trading Card */}
          <Box
            sx={{
              borderRadius: 2,
              border: "none",
              boxShadow: (theme) => theme.shadows[1],
              bgcolor: 'background.paper',
              p: 3,
              transition: "box-shadow 0.12s ease-in-out",
              '&:hover': {
                boxShadow: (theme) => theme.shadows[4],
              },
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Start New Copy Trading
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Enter a trader code to begin copying their trades
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'primary.main' }}>
                  Trader Code
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TextField
                    type="text"
                    placeholder="ABC123"
                    value={traderCode}
                    onChange={(e) => setTraderCode(e.target.value)}
                    variant="outlined"
                    fullWidth
                    sx={{ flex: 1 }}
                  />
                  <Button
                    onClick={handleVerifyTrader}
                    disabled={!traderCode.trim() || verifyTraderMutation.isPending}
                    aria-busy={verifyTraderMutation.isPending || undefined}
                  >
                    Verify
                  </Button>
                </Box>
              </Box>

              {verificationResult?.valid && verificationResult.trader && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <Box
                    sx={{
                      borderRadius: 2,
                      border: 1,
                      borderColor: 'success.light',
                      bgcolor: 'success.lighter',
                      p: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={toAbsoluteResource(verificationResult.trader.avatar_url ?? undefined)}
                          sx={{ width: 32, height: 32 }}
                        >
                          {verificationResult.trader.displayName?.split(' ').slice(0,2).map(p=>p.charAt(0).toUpperCase()).join('') || 'T'}
                        </Avatar>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.dark' }}>
                          {verificationResult.trader.displayName}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ color: 'success.main' }}>
                          {verificationResult.trader?.specialty} • {verificationResult.trader?.risk_level} Risk
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'success.main', mt: 0.5, display: 'block' }}>
                          Performance: {verificationResult.trader.performance} • Win Rate: {verificationResult.trader.winRate}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip label="Verified" color="success" size="small" />
                  </Box>
                </motion.div>
              )}

              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'primary.main' }}>
                  Allocation Amount (USD)
                </Typography>
                <TextField
                  type="number"
                  placeholder="Enter amount to allocate"
                  value={allocationAmount}
                  onChange={(e) => setAllocationAmount(e.target.value)}
                  variant="outlined"
                  fullWidth
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Minimum allocation: $100.00
                </Typography>
              </Box>

              <Button
                onClick={handleStartCopyTrading}
                fullWidth
                size="large"
                disabled={!verificationResult?.valid || !allocationAmount || startCopyTradingMutation.isPending}
                aria-busy={startCopyTradingMutation.isPending || undefined}
              >
                Start Copy Trading
              </Button>
            </Stack>
          </Box>
        </Stack>

        {/* Right Column - Secondary Actions (40% width) */}
        <Stack spacing={3}>
          {/* Copy Trading Wallet Card */}
          <Box
            sx={{
              borderRadius: 2,
              border: "none",
              boxShadow: (theme) => theme.shadows[1],
              bgcolor: 'background.paper',
              p: 3,
              transition: "box-shadow 0.12s ease-in-out",
              '&:hover': {
                boxShadow: (theme) => theme.shadows[4],
              },
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Copy Trading Wallet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Transfer funds from your wallet into the copy trading wallet
              </Typography>
            </Box>
            <Stack spacing={3}>
              <FundCopyWallet />
            </Stack>
          </Box>

          {/* Recent Executions */}
          <Box
            sx={{
              borderRadius: 2,
              border: "none",
              boxShadow: (theme) => theme.shadows[1],
              bgcolor: 'background.paper',
              p: 3,
              transition: "box-shadow 0.12s ease-in-out",
              '&:hover': {
                boxShadow: (theme) => theme.shadows[4],
              },
            }}
          >
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent Executions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Profit/Loss from the latest copy trades
                </Typography>
              </Box>
              <Button size="small" variant="text" component={Link as any} to="/dashboard/executions">
                View all
              </Button>
            </Box>
            {copyExecutionsQuery.isLoading ? (
              <Typography variant="body2" color="text.secondary">Loading executions...</Typography>
            ) : (copyExecutionsQuery.data?.data?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">No executions yet.</Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Net P/L (last 25)</Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color:
                        (copyExecutionsQuery.data?.data ?? []).reduce((sum: number, ev: any) => sum + Number(ev.amount ?? 0), 0) >= 0
                          ? 'success.main'
                          : 'error.main',
                    }}
                  >
                    {formatCurrency(
                      (copyExecutionsQuery.data?.data ?? []).reduce(
                        (sum: number, ev: any) => sum + Number(ev.amount ?? 0),
                        0,
                      ),
                    )}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowExecutions((v) => !v)}
                  sx={{ mb: 2 }}
                >
                  {showExecutions ? "Hide executions" : "Show executions"}
                </Button>
                {showExecutions && (
                  <Stack spacing={1.25}>
                    {(copyExecutionsQuery.data?.data ?? []).map((ev: any) => (
                      <Box
                        key={ev.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto auto',
                          gap: 1,
                          alignItems: 'center',
                          p: 1.25,
                          borderRadius: 1.5,
                          bgcolor: 'background.default',
                        }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{ev.trader_name || ev.type || "Execution"}</Typography>
                          <Typography variant="caption" color="text.secondary">{ev.symbol || ev.description || "Trade"}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(ev.created_at || ev.timestamp || Date.now()).toLocaleString()}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, textAlign: 'right', color: Number(ev.amount ?? 0) >= 0 ? 'success.main' : 'error.main' }}
                        >
                          {formatCurrency(Number(ev.amount ?? 0))}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Box>
        </Stack>
      </Box>

      {/* Move Funds Drawer */}
      <MoveFundsDrawer
        open={moveFundsOpen}
        onClose={() => setMoveFundsOpen(false)}
      />

      {/* Stop Copy Relationship Confirmation */}
      <Dialog
        open={confirmStop.open}
        onClose={handleConfirmStopClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Stop Copy Trading</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Stopping will permanently end this copy relationship.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your copy equity for this relationship{" "}
            (<strong>{formatCurrency(confirmStop.allocation)}</strong> plus any realized copy PnL)
            will be liquidated and returned to your <strong>Copy Trading Wallet</strong> (not your
            Main Wallet).
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Do you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmStopClose} sx={{ minHeight: 44 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmStopProceed}
            variant="contained"
            color="error"
            disabled={stopCopyMutation.isPending}
            sx={{ minHeight: 44 }}
          >
            {stopCopyMutation.isPending ? "Stopping..." : "Stop Copying"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
