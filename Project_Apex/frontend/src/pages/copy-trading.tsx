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
  Alert,
  Tooltip,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/providers/auth-provider";
import { toAbsoluteResource } from "@/utils/url";
import { CopyTradingService } from "@/api/services/CopyTradingService";
import { TransactionsService } from "@/api/services/TransactionsService";
import type { CopiedTraderSummary } from "@/api/models/CopiedTraderSummary";
import type { CopyTradingStartResponse } from "@/api/models/CopyTradingStartResponse";
import type { CopyTradingUpdateResponse } from "@/api/models/CopyTradingUpdateResponse";
import type { TraderVerificationResponse } from "@/api/models/TraderVerificationResponse";
import type { CopyStatus } from "@/api/models/CopyStatus";
import type { RiskTolerance } from "@/api/models/RiskTolerance";
import type { CopyTradingStartRequest } from "@/api/models/CopyTradingStartRequest";
import type { TraderVerificationRequest } from "@/api/models/TraderVerificationRequest";
import PeopleIcon from "@mui/icons-material/People";
import LockIcon from "@mui/icons-material/Lock";
import PendingIcon from "@mui/icons-material/Pending";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import type { CopyTradingSummaryResponse } from "@/api/models/CopyTradingSummaryResponse";
import { toast } from "react-toastify";
import { MoveFundsDrawer } from "@/components/dashboard/move-funds-drawer";
import { DepositModal } from "@/components/crypto/deposit/DepositModal";
import { extractApiErrorMessage } from "@/utils/errors";
import { usePendingDeposits, cryptoKeys } from "@/services/crypto";
import { useClipboard } from "@/hooks/use-clipboard";

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
  const [moveFundsRoute, setMoveFundsRoute] = useState<"MAIN_TO_COPY" | "COPY_TO_MAIN">("MAIN_TO_COPY");
  const [verificationResult, setVerificationResult] = useState<TraderVerificationResponse | null>(null);
  const [showExecutions, setShowExecutions] = useState(false);
  const [confirmStop, setConfirmStop] = useState<{ open: boolean; copyId: string | null; allocation: number }>({ open: false, copyId: null, allocation: 0 });
  const stopPreviewQuery = useQuery({
    queryKey: ["copy-trading-stop-preview", confirmStop.copyId],
    queryFn: () => CopyTradingService.copyTradingGetStopPreview(confirmStop.copyId!),
    enabled: Boolean(confirmStop.open && confirmStop.copyId),
  });
  const [commissionModalState, setCommissionModalState] = useState<{
    open: boolean;
    amount: number;
    traderName: string;
    copyId: string | null;
    sessionProfit: number;
    feePercentage: number;
    releasedEquity: number;
  }>({
    open: false,
    amount: 0,
    traderName: "",
    copyId: null,
    sessionProfit: 0,
    feePercentage: 0,
    releasedEquity: 0,
  });

  const { copied, copy: copyClipboard } = useClipboard();

  const handleCopyTraderCode = async (code: string) => {
    if (!code) return;
    const res = await copyClipboard(code, code);
    if (res.success) {
      toast.success(`Trader code ${code} copied to clipboard`);
    } else {
      toast.error("Failed to copy trader code to clipboard. Please copy manually.");
    }
  };

  const handleOpenMoveFunds = (route: "MAIN_TO_COPY" | "COPY_TO_MAIN" = "MAIN_TO_COPY") => {
    setMoveFundsRoute(route);
    setMoveFundsOpen(true);
  };

  const handleTraderCodeChange = (newCode: string) => {
    setTraderCode(newCode);
    if (verificationResult) {
      setVerificationResult(null);
    }
  };

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

  const invalidateCopyTradingState = () => {
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    queryClient.invalidateQueries({ queryKey: ["users-me"] });
    queryClient.invalidateQueries({ queryKey: ["copy-trading-summary"] });
    queryClient.invalidateQueries({ queryKey: ["copied-traders"] });
    queryClient.invalidateQueries({ queryKey: ["pending-summary"] });
    queryClient.invalidateQueries({ queryKey: cryptoKeys.pendingDeposits() });
    invalidateDashboardQueries();
  };

  const pendingDepositsQuery = usePendingDeposits();
  const rawPendingDeposits = pendingDepositsQuery.data ?? [];
  const pendingDeposits = Array.isArray(rawPendingDeposits)
    ? rawPendingDeposits.filter((d) => !d.status || d.status.toUpperCase() === "PENDING")
    : [];

  const copiedTradersQuery = useQuery<CopiedTraderSummary[]>({
    queryKey: ["copied-traders"],
    queryFn: async () => {
      const res = await CopyTradingService.copyTradingListCopiedTraders(0, 100);
      return res.data;
    },
  });

  const copySummaryQuery = useQuery<CopyTradingSummaryResponse>({
    queryKey: ["copy-trading-summary"],
    queryFn: () => CopyTradingService.copyTradingGetCopyTradingUserSummary(),
  });

  const pendingSummaryQuery = useQuery({
    queryKey: ["pending-summary"],
    queryFn: () => TransactionsService.transactionsGetPendingSummary(),
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
      toast.error(extractApiErrorMessage(error, "Failed to verify trader code. Please try again."));
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
      toast.error(extractApiErrorMessage(error, "Failed to start copy trading. Please try again."));
    },
  });

  const handleVerifyTrader = () => {
    if (!traderCode.trim()) {
      toast.error("Please enter a trader code");
      return;
    }

    verifyTraderMutation.mutate(traderCode.trim().toUpperCase());
  };

  const copiedTraders = Array.isArray(copiedTradersQuery.data) ? copiedTradersQuery.data : [];

  const summaryPositions = copySummaryQuery.data?.positions ?? [];
  const allPositions = summaryPositions.length > 0 ? summaryPositions : copiedTraders;
  const visibleTraders = allPositions.filter(
    (entry: any) => entry.status !== "STOPPED",
  );

  const stoppedWithHeldEquity = allPositions.filter(
    (entry: any) =>
      entry.status === "STOPPED" &&
      ((Number(entry.held_released_equity) > 0) || (Number(entry.commission_due) > 0 && !entry.equity_released))
  );

  const stoppedWithoutHeldEquity = allPositions.filter(
    (entry: any) =>
      entry.status === "STOPPED" &&
      !((Number(entry.held_released_equity) > 0) || (Number(entry.commission_due) > 0 && !entry.equity_released))
  );

  const copyWalletBalance =
    typeof copySummaryQuery.data?.copy_trading_wallet_balance === "number"
      ? copySummaryQuery.data.copy_trading_wallet_balance
      : typeof user?.copy_trading_wallet_balance === "number"
        ? user.copy_trading_wallet_balance
        : 0;

  const mainWalletBalance =
    typeof copySummaryQuery.data?.wallet_balance === "number"
      ? copySummaryQuery.data.wallet_balance
      : typeof (user as any)?.wallet_balance === "number"
        ? (user as any).wallet_balance
        : typeof user?.availableBalance === "number"
          ? user.availableBalance
          : typeof user?.balance === "number"
            ? user.balance
            : 0;

  const activeTradingBalance =
    typeof copySummaryQuery.data?.total_allocation === "number"
      ? copySummaryQuery.data.total_allocation
      : (user as any)?.allocatedCopyBalance ?? (user as any)?.copy_trading_balance ?? 0;

  const getPendingCommissionDeposit = (copyId: string | null | undefined) => {
    if (!copyId) return undefined;
    return pendingDeposits.find((tx: any) => {
      const metaCopyId = tx.metadata_payload?.copy_id;
      if (metaCopyId && String(metaCopyId) === String(copyId)) {
        return true;
      }
      if (tx.description && tx.description.includes(String(copyId))) {
        return true;
      }
      return false;
    });
  };

  const unconfirmedStopped = stoppedWithHeldEquity.filter((t: any) => {
    const dep = getPendingCommissionDeposit(t.copy_id || t.id);
    return !dep?.payment_confirmed_by_user;
  });

  const pendingVerificationStopped = stoppedWithHeldEquity.filter((t: any) => {
    const dep = getPendingCommissionDeposit(t.copy_id || t.id);
    return Boolean(dep?.payment_confirmed_by_user);
  });

  const allCommissionsConfirmed =
    stoppedWithHeldEquity.length > 0 && unconfirmedStopped.length === 0;

  const totalHeldEquity =
    (typeof copySummaryQuery.data?.total_held_equity === "number" && copySummaryQuery.data.total_held_equity > 0)
      ? copySummaryQuery.data.total_held_equity
      : (allPositions ?? []).reduce(
          (sum: number, t: any) => sum + (Number(t.held_released_equity) || 0),
          0
        );

  const totalCommissionDue =
    (typeof copySummaryQuery.data?.total_commission_due === "number" && copySummaryQuery.data.total_commission_due > 0)
      ? copySummaryQuery.data.total_commission_due
      : (allPositions ?? []).reduce(
          (sum: number, t: any) => sum + (Number(t.commission_due) || 0),
          0
        );

  const handleOpenCommissionModal = (trader: any) => {
    setCommissionModalState({
      open: true,
      amount: Number(trader.commission_due) || 0,
      traderName: trader.displayName || trader.display_name || "Trader",
      copyId: trader.copy_id || trader.id,
      sessionProfit: Number(trader.session_profit) || Number(trader.total_profit) || 0,
      feePercentage: Number(trader.feePercentage) || Number(trader.copy_fee_percentage) || 20,
      releasedEquity: Number(trader.held_released_equity) || Number(trader.allocation) || 0,
    });
  };

  const activeCopyCount =
    copySummaryQuery.data?.active_positions ?? visibleTraders.filter((entry: any) => entry.status === "ACTIVE").length;
  const pausedCopyCount =
    copySummaryQuery.data?.paused_positions ?? visibleTraders.filter((entry: any) => entry.status === "PAUSED").length;

  const currentTrimmedCode = traderCode.trim().toUpperCase();
  const verifiedTraderCode = (
    verificationResult?.trader?.trader_code ||
    verificationResult?.trader?.traderCode ||
    ""
  ).toUpperCase();
  const isTraderVerified = Boolean(
    verificationResult?.valid &&
    verificationResult.trader &&
    verifiedTraderCode &&
    verifiedTraderCode === currentTrimmedCode
  );

  const handleStartCopyTrading = () => {
    if (!isTraderVerified || !verificationResult?.trader) {
      setVerificationResult(null);
      toast.error("Please verify the trader code before starting copy trading");
      return;
    }

    const amount = parseFloat(allocationAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid allocation amount");
      return;
    }

    if (amount > copyWalletBalance) {
      toast.error(`Allocation amount exceeds your Copy Trading Wallet balance (${formatCurrency(copyWalletBalance)})`);
      return;
    }

    startCopyTradingMutation.mutate({
      traderId: verificationResult.trader.id,
      amount,
    });
  };

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
      toast.error(extractApiErrorMessage(error, "Failed to pause copy trading relationship."));
    },
  });

  const stopCopyMutation = useMutation<
    CopyTradingUpdateResponse,
    Error,
    { copyId: string; allocation: number }
  >({
    mutationFn: ({ copyId }) => CopyTradingService.copyTradingStopCopyRelationship(copyId),
    onSuccess: (data, variables) => {
      const next = data.available_balance ?? 0;
      invalidateCopyTradingState();
      if (data.commission_due && data.commission_due > 0) {
        setCommissionModalState({
          open: true,
          amount: data.commission_due,
          traderName: data.trader_name || "Trader",
          copyId: variables.copyId,
          sessionProfit: data.session_profit ?? 0,
          feePercentage: data.copy_fee_percentage ?? 20,
          releasedEquity: data.released_equity ?? 0,
        });
      } else {
        toast.success(`${data.message} Updated balance: ${formatCurrency(next)}.`);
      }
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error, "Failed to stop copy trading relationship."));
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
      stopCopyMutation.mutate(
        { copyId: confirmStop.copyId, allocation: confirmStop.allocation },
        {
          onSettled: () => {
            handleConfirmStopClose();
          },
        }
      );
    }
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
      toast.error(extractApiErrorMessage(error, "Failed to resume copy trading relationship."));
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
              gap: { xs: 1.5, sm: 3 },
              alignItems: { xs: 'stretch', sm: 'center' },
              width: { xs: '100%', lg: 'auto' },
            }}
          >
            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="body2" color="text.secondary">
                Copy Trading Wallet
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {formatCurrency(copyWalletBalance)}
              </Typography>
              {totalHeldEquity > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                    mt: 0.5,
                  }}
                >
                  <LockIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                  <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                    Held in Escrow: {formatCurrency(totalHeldEquity)}
                  </Typography>
                </Box>
              )}
              {(pendingSummaryQuery.data?.copy_trading_wallet_pending ?? 0) > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  Pending Admin Approval: {formatCurrency(pendingSummaryQuery.data?.copy_trading_wallet_pending ?? 0)}
                </Typography>
              )}
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
              onClick={() => handleOpenMoveFunds('MAIN_TO_COPY')}
              sx={{ width: { xs: '100%', sm: 'auto' }, py: { xs: 0.85, sm: 0.75 } }}
            >
              Transfer Funds
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Held Equity Escrow Notification Banner */}
      {totalHeldEquity > 0 && (
        <Alert
          severity={allCommissionsConfirmed ? "info" : "warning"}
          icon={
            allCommissionsConfirmed ? (
              <PendingIcon fontSize="inherit" sx={{ mt: { xs: 0.5, sm: 0 } }} />
            ) : (
              <LockIcon fontSize="inherit" sx={{ mt: { xs: 0.5, sm: 0 } }} />
            )
          }
          sx={{
            borderRadius: 2,
            border: 1,
            borderColor: allCommissionsConfirmed ? 'info.light' : 'warning.light',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            '& .MuiAlert-message': {
              width: '100%',
              p: 0,
            },
            '& .MuiAlert-action': {
              m: 0,
              p: 0,
              pt: { xs: 1.5, sm: 0 },
              pl: { sm: 2 },
              width: { xs: '100%', sm: 'auto' },
              alignSelf: { xs: 'stretch', sm: 'center' },
            },
          }}
          action={
            allCommissionsConfirmed ? (
              <Chip
                icon={<PendingIcon />}
                label="VERIFICATION PENDING"
                color="info"
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  fontWeight: 600,
                  py: { xs: 0.75, sm: 0.5 },
                }}
              />
            ) : unconfirmedStopped.length === 1 ? (
              <Button
                color="warning"
                variant="contained"
                size="small"
                onClick={() => handleOpenCommissionModal(unconfirmedStopped[0])}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  py: { xs: 0.75, sm: 0.5 },
                }}
              >
                Pay Commission ({formatCurrency(Number(unconfirmedStopped[0].commission_due) || 0)})
              </Button>
            ) : unconfirmedStopped.length > 1 ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap', justifyContent: { sm: 'flex-end' } }}
              >
                {unconfirmedStopped.map((trader: any) => {
                  const tName = trader.displayName || trader.display_name || "Trader";
                  const due = Number(trader.commission_due) || 0;
                  return (
                    <Button
                      key={trader.copy_id || trader.id}
                      color="warning"
                      variant="contained"
                      size="small"
                      onClick={() => handleOpenCommissionModal(trader)}
                      sx={{
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                        py: { xs: 0.75, sm: 0.5 },
                      }}
                    >
                      Pay {tName} ({formatCurrency(due)})
                    </Button>
                  );
                })}
              </Stack>
            ) : undefined
          }
        >
          <Box sx={{ pr: { sm: 2 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {unconfirmedStopped.length > 1
                ? `${formatCurrency(totalHeldEquity)} Liquidated Equity Held Across ${unconfirmedStopped.length} Sessions`
                : unconfirmedStopped.length === 1
                  ? `${formatCurrency(Number(unconfirmedStopped[0].held_released_equity) || Number(unconfirmedStopped[0].allocation) || totalHeldEquity)} Liquidated Equity Held in Escrow (${unconfirmedStopped[0].displayName || unconfirmedStopped[0].display_name || "Trader"})`
                  : `${formatCurrency(totalHeldEquity)} Liquidated Equity Held in Escrow`}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontSize: { xs: '0.825rem', sm: '0.875rem' }, lineHeight: 1.45 }}>
              {allCommissionsConfirmed
                ? `Your commission payments have been submitted and are currently being verified by our compliance team. Once confirmed, your held equity (${formatCurrency(totalHeldEquity)}) will be unlocked and credited directly to your Copy Trading Wallet.`
                : unconfirmedStopped.length > 1
                  ? `You have ${unconfirmedStopped.length} stopped copy trading sessions with realized profit held in escrow${pendingVerificationStopped.length > 0 ? ` (${pendingVerificationStopped.length} already submitted for verification)` : ''}. Each session's commission must be settled individually to release its corresponding equity to your Copy Trading Wallet.`
                  : unconfirmedStopped.length === 1
                    ? `Your stopped copy trading session with ${unconfirmedStopped[0].displayName || unconfirmedStopped[0].display_name || "Trader"} has realized profit. Your funds (${formatCurrency(Number(unconfirmedStopped[0].held_released_equity) || Number(unconfirmedStopped[0].allocation) || totalHeldEquity)}) are safely held in escrow pending verification of the performance commission (${formatCurrency(Number(unconfirmedStopped[0].commission_due) || totalCommissionDue)}). Once verified by our team, your funds will be unlocked and credited directly to your Copy Trading Wallet.`
                    : `Your stopped copy trading session has realized profit. Your funds (${formatCurrency(totalHeldEquity)}) are safely held in escrow pending verification of the trader's performance commission (${formatCurrency(totalCommissionDue)}). Once verified by our team, your funds will be unlocked and credited directly to your Copy Trading Wallet.`}
            </Typography>
          </Box>
        </Alert>
      )}

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
              stoppedWithHeldEquity.length > 0 ? (
                <Stack spacing={2}>
                  <Alert severity={allCommissionsConfirmed ? "info" : "warning"} sx={{ borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {allCommissionsConfirmed ? "Commission Submitted — Verification in Progress" : "Copy Session Ended — Settlement Pending"}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {allCommissionsConfirmed
                        ? "Your copy equity was liquidated and is held securely in escrow while your submitted commission payment is verified by our team. Once confirmed, your funds will be released."
                        : "You have ended your copy relationship. Your copy equity was liquidated and is held securely in escrow pending trader commission payment and admin verification."}
                    </Typography>
                  </Alert>

                  {stoppedWithHeldEquity.map((trader: any) => {
                    const traderDisplayName = trader.displayName || trader.display_name || "Trader";
                    const traderCodeVal = trader.traderCode || trader.trader_code || "";
                    const heldEquity = Number(trader.held_released_equity) || Number(trader.allocation) || 0;
                    const sessionProfit = Number(trader.session_profit) || Number(trader.total_profit) || 0;
                    const commissionDue = Number(trader.commission_due) || 0;
                    const deposit = getPendingCommissionDeposit(trader.copy_id || trader.id);
                    const isVerificationPending = Boolean(deposit?.payment_confirmed_by_user);

                    return (
                      <Box
                        key={trader.copy_id || trader.id}
                        sx={{
                          borderRadius: 2,
                          border: 1,
                          borderColor: isVerificationPending ? 'info.light' : 'warning.light',
                          bgcolor: isVerificationPending ? 'info.lighter' : 'warning.lighter',
                          p: { xs: 2, sm: 2.5 },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              src={toAbsoluteResource(trader.avatar_url ?? undefined)}
                              sx={{ width: 40, height: 40 }}
                            >
                              {traderDisplayName.split(' ').slice(0, 2).map((p: string) => p.charAt(0).toUpperCase()).join('') || 'T'}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {traderDisplayName}
                                </Typography>
                                {isVerificationPending ? (
                                  <Chip
                                    icon={<PendingIcon sx={{ fontSize: '14px !important' }} />}
                                    label="VERIFICATION PENDING"
                                    color="info"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                ) : (
                                  <Chip label="SETTLEMENT PENDING" color="warning" size="small" sx={{ fontWeight: 600 }} />
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {trader.specialty || "Cryptocurrency Trader"}{traderCodeVal ? ` • Code: ${traderCodeVal}` : ''}
                                </Typography>
                                {Boolean(traderCodeVal) && (
                                  <Tooltip title={copied === traderCodeVal ? "Copied!" : "Copy trader code"}>
                                    <IconButton
                                      size="small"
                                      aria-label={`Copy trader code ${traderCodeVal}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyTraderCode(traderCodeVal);
                                      }}
                                      sx={{ p: 0.25 }}
                                    >
                                      {copied === traderCodeVal ? (
                                        <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                      ) : (
                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                            gap: { xs: 1.25, sm: 2 },
                            p: { xs: 1.25, sm: 1.5 },
                            borderRadius: 1.5,
                            bgcolor: 'background.paper',
                            mb: 2,
                          }}
                        >
                          <Box sx={{ display: { xs: 'flex', sm: 'block' }, justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              Held Released Equity
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: isVerificationPending ? 'info.dark' : 'warning.dark' }}>
                              {formatCurrency(heldEquity)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: { xs: 'flex', sm: 'block' }, justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              Session Profit
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 700,
                                color: sessionProfit >= 0 ? 'success.main' : 'error.main',
                              }}
                            >
                              {formatCurrency(sessionProfit)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: { xs: 'flex', sm: 'block' }, justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              Commission Due
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: isVerificationPending ? 'text.secondary' : 'error.main' }}>
                              {formatCurrency(commissionDue)}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, mb: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', display: 'block', mb: 0.5 }}>
                            {isVerificationPending
                              ? "Payment Submitted — Verification in Progress"
                              : "Why does my Copy Trading Wallet show $0.00?"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                            {isVerificationPending ? (
                              <>
                                Your commission payment of <strong>{formatCurrency(commissionDue)}</strong> has been confirmed on your end and is waiting for administrator verification. Once our team verifies the transaction, your full equity of <strong>{formatCurrency(heldEquity)}</strong> will be credited to your Copy Trading Wallet.
                              </>
                            ) : (
                              <>
                                Your session equity of <strong>{formatCurrency(heldEquity)}</strong> was safely liquidated when you stopped copying. In accordance with copy trading terms, realized profit is subject to trader commission ({formatCurrency(commissionDue)}). As soon as your commission payment is verified by our team, your full equity of <strong>{formatCurrency(heldEquity)}</strong> will be immediately unlocked and credited to your Copy Trading Wallet.
                              </>
                            )}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
                          {isVerificationPending ? (
                            <Button
                              variant="outlined"
                              color="info"
                              disabled
                              sx={{ fontWeight: 600, width: { xs: '100%', sm: 'auto' }, py: { xs: 1, sm: 0.75 } }}
                            >
                              Verification Pending
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => handleOpenCommissionModal(trader)}
                              sx={{ fontWeight: 600, width: { xs: '100%', sm: 'auto' }, py: { xs: 1, sm: 0.75 } }}
                            >
                              Pay Commission ({formatCurrency(commissionDue)})
                            </Button>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              ) : stoppedWithoutHeldEquity.length > 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                    No Active Copy Relationships
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 400, mx: 'auto' }}>
                    All previous copy sessions have ended and settled. Enter a trader code below to start copying a new trader.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    You're not copying any traders yet
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Start by entering a trader code below
                  </Typography>
                </Box>
              )
            ) : (
              <Stack spacing={2}>
                {stoppedWithHeldEquity.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: allCommissionsConfirmed ? 'info.main' : 'warning.main', mb: 1 }}>
                      {allCommissionsConfirmed ? `Pending Verification (${stoppedWithHeldEquity.length})` : `Pending Settlements (${stoppedWithHeldEquity.length})`}
                    </Typography>
                    {stoppedWithHeldEquity.map((trader: any) => {
                      const traderDisplayName = trader.displayName || trader.display_name || "Trader";
                      const heldEquity = Number(trader.held_released_equity) || Number(trader.allocation) || 0;
                      const commissionDue = Number(trader.commission_due) || 0;
                      const deposit = getPendingCommissionDeposit(trader.copy_id || trader.id);
                      const isVerificationPending = Boolean(deposit?.payment_confirmed_by_user);
                      return (
                        <Box
                          key={trader.copy_id || trader.id}
                          sx={{
                            borderRadius: 2,
                            border: 1,
                            borderColor: isVerificationPending ? 'info.light' : 'warning.light',
                            bgcolor: isVerificationPending ? 'info.lighter' : 'warning.lighter',
                            p: { xs: 1.5, sm: 2 },
                            mb: 2,
                          }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1, mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {traderDisplayName}
                              </Typography>
                              {isVerificationPending ? (
                                <Chip icon={<PendingIcon sx={{ fontSize: '12px !important' }} />} label="VERIFICATION PENDING" color="info" size="small" sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }} />
                              ) : (
                                <Chip label="SETTLEMENT PENDING" color="warning" size="small" sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }} />
                              )}
                            </Box>
                            {isVerificationPending ? (
                              <Button
                                size="small"
                                variant="outlined"
                                color="info"
                                disabled
                                sx={{ width: { xs: '100%', sm: 'auto' }, fontWeight: 600 }}
                              >
                                Verification Pending
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => handleOpenCommissionModal(trader)}
                                sx={{ width: { xs: '100%', sm: 'auto' }, fontWeight: 600 }}
                              >
                                Pay Commission ({formatCurrency(commissionDue)})
                              </Button>
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            Held Equity: <strong>{formatCurrency(heldEquity)}</strong> • Commission Due: <strong>{formatCurrency(commissionDue)}</strong>
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
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
                            {Boolean(trader.traderCode || (trader as any).trader_code) && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Code: {trader.traderCode || (trader as any).trader_code}
                                </Typography>
                                <Tooltip
                                  title={
                                    copied === (trader.traderCode || (trader as any).trader_code)
                                      ? "Copied!"
                                      : "Copy trader code"
                                  }
                                >
                                  <IconButton
                                    size="small"
                                    aria-label={`Copy trader code ${trader.traderCode || (trader as any).trader_code}`}
                                    onClick={() =>
                                      handleCopyTraderCode(trader.traderCode || (trader as any).trader_code)
                                    }
                                    sx={{ p: 0.5 }}
                                  >
                                    {copied === (trader.traderCode || (trader as any).trader_code) ? (
                                      <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                    ) : (
                                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
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
                    onChange={(e) => handleTraderCodeChange(e.target.value)}
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

              {isTraderVerified && verificationResult?.trader && (
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
                disabled={!isTraderVerified || !allocationAmount || startCopyTradingMutation.isPending}
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
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Copy Trading Wallet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Manage funds dedicated specifically to copy trading allocations
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.default',
                mb: 2.5,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Available Copy Balance
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
                {formatCurrency(copyWalletBalance)}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  Main Wallet Balance
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(mainWalletBalance)}
                </Typography>
              </Box>

              {totalHeldEquity > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="warning.main">
                    Held in Escrow
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                    {formatCurrency(totalHeldEquity)}
                  </Typography>
                </Box>
              )}
            </Box>

            <Stack spacing={1.5}>
              <Button
                variant="contained"
                fullWidth
                size="medium"
                onClick={() => handleOpenMoveFunds('MAIN_TO_COPY')}
              >
                Fund from Main Wallet
              </Button>
              <Button
                variant="outlined"
                fullWidth
                size="medium"
                onClick={() => handleOpenMoveFunds('COPY_TO_MAIN')}
                disabled={copyWalletBalance <= 0}
              >
                Withdraw to Main Wallet
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
              Transfers between main and copy wallets are processed instantly with zero fees.
            </Typography>
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
        initialRoute={moveFundsRoute}
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Stopping will permanently end this copy relationship. Review the calculated settlement breakdown below before confirming liquidation.
          </Typography>

          {stopPreviewQuery.isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={36} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Calculating settlement & escrow holds...
              </Typography>
            </Box>
          ) : stopPreviewQuery.isError ? (
            <Box sx={{ mb: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Unable to load real-time settlement preview. Your principal allocation of <strong>{formatCurrency(confirmStop.allocation)}</strong> plus any realized copy PnL will be liquidated according to standard settlement rules.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                If this session generated net profits, performance commission will be due upon completion and liquidated equity will be securely held in escrow until the commission is verified.
              </Typography>
            </Box>
          ) : stopPreviewQuery.data ? (
            <Box>
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 1,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(0, 0, 0, 0.02)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack spacing={1.2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Trader:</Typography>
                    <Typography variant="body2" fontWeight={600}>{stopPreviewQuery.data.trader_name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Principal Allocation:</Typography>
                    <Typography variant="body2" fontWeight={500}>{formatCurrency(stopPreviewQuery.data.allocation)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Session Realized Profit:</Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={stopPreviewQuery.data.session_profit > 0 ? 'success.main' : 'text.primary'}
                    >
                      {formatCurrency(stopPreviewQuery.data.session_profit)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Performance Fee Rate:</Typography>
                    <Typography variant="body2">{stopPreviewQuery.data.copy_fee_percentage}%</Typography>
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Commission Due:</Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={stopPreviewQuery.data.commission_due > 0 ? 'warning.main' : 'text.secondary'}
                    >
                      {formatCurrency(stopPreviewQuery.data.commission_due)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Total Liquidated Equity:</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formatCurrency(stopPreviewQuery.data.release_amount)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {stopPreviewQuery.data.requires_commission_deposit || stopPreviewQuery.data.commission_due > 0 ? (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    Performance Commission Required
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                    Because this copy session earned {formatCurrency(stopPreviewQuery.data.session_profit)} in profit, a {stopPreviewQuery.data.copy_fee_percentage}% trader performance commission of <strong>{formatCurrency(stopPreviewQuery.data.commission_due)}</strong> is due.
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Escrow Hold:</strong> Your liquidated equity of <strong>{formatCurrency(stopPreviewQuery.data.held_released_equity)}</strong> will be held in escrow until commission payment is confirmed. You will be prompted to deposit the commission immediately after stopping.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    No Commission Due
                  </Typography>
                  <Typography variant="caption" display="block">
                    No performance commission is owed for this session. Your full liquidated equity of <strong>{formatCurrency(stopPreviewQuery.data.immediate_release_amount)}</strong> will be credited immediately to your <strong>Copy Trading Wallet</strong>.
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmStopClose} sx={{ minHeight: 44 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmStopProceed}
            variant="contained"
            color="error"
            disabled={stopCopyMutation.isPending || stopPreviewQuery.isLoading}
            sx={{ minHeight: 44 }}
          >
            {stopCopyMutation.isPending ? "Stopping..." : "Stop Copying"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Trader Commission Deposit Modal */}
      {commissionModalState.copyId && (
        <DepositModal
          open={commissionModalState.open}
          onClose={() =>
            setCommissionModalState((prev) => ({ ...prev, open: false }))
          }
          onConfirmSuccess={invalidateCopyTradingState}
          initialAmount={commissionModalState.amount}
          lockAmount={true}
          title={`Trader Commission - ${commissionModalState.traderName}`}
          subtitle={`Session profit: ${formatCurrency(commissionModalState.sessionProfit)} (${commissionModalState.feePercentage}% commission fee). Upon admin payment confirmation, ${formatCurrency(commissionModalState.releasedEquity)} released equity will be credited to your Copy Trading Wallet.`}
          metadataPayload={{
            type: "COPY_TRADING_COMMISSION",
            copy_id: commissionModalState.copyId,
            trader_name: commissionModalState.traderName,
            commission_amount: commissionModalState.amount,
            session_profit: commissionModalState.sessionProfit,
            fee_percentage: commissionModalState.feePercentage,
            held_released_equity: commissionModalState.releasedEquity,
          }}
          description={`Trader commission: ${commissionModalState.amount.toFixed(2)} USD for copy session ${commissionModalState.copyId} (${commissionModalState.traderName})`}
        />
      )}
    </Box>
  );
};
