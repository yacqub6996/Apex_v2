import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Grid,
    Stack,
    Typography,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    InputAdornment,
    Checkbox,
    FormControlLabel,
} from "@mui/material";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useAuth } from "@/providers/auth-provider";
import { LongTermService } from "@/api/services/LongTermService";
import { RoiCalculationsService } from "@/api/services/RoiCalculationsService";
import { LongTermAllocation } from "@/components/dashboard/long-term-allocation";
import { MoveFundsDrawer } from "@/components/dashboard/move-funds-drawer";
import { DepositRequest } from "@/components/dashboard/deposit-request";
import { RouteGuard } from "@/components/auth/route-guard";
import { MaterialDashboardLayout, type MaterialDashboardNavItem } from "@/components/layouts/material-dashboard";
import {
    increaseLongTermEquity,
    requestActiveInvestmentWithdrawal,
    requestLongTermWalletWithdrawal,
} from "@/services/long-term-investment-actions";
import type { LongTermInvestmentItem } from "@/api/models/LongTermInvestmentItem";
import { ApiError } from "@/api/core/ApiError";
import { toAbsoluteResource } from "@/utils/url";
import { DASHBOARD_GRID_SPACING } from "@/constants/layout";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

const USER_NAVIGATION: MaterialDashboardNavItem[] = [
    { label: "Dashboard", to: "/dashboard", icon: DashboardOutlinedIcon, exact: true },
    { label: "Long-Term Plans", to: "/plans", icon: TrendingUpOutlinedIcon },
    { label: "Copy Trading", to: "/dashboard/copy-trading", icon: PeopleOutlinedIcon },
    { label: "Executions", to: "/dashboard/executions", icon: HistoryOutlinedIcon },
    { label: "Account", to: "/dashboard/account", icon: AccountBalanceOutlinedIcon },
    { label: "Settings", to: "/dashboard/settings", icon: SettingsOutlinedIcon },
];

export const Route = createFileRoute("/plans")({
    component: () => (
        <RouteGuard>
            <LongTermPlansPage />
        </RouteGuard>
    ),
});

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
};

function LongTermPlansPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [addFundsDialog, setAddFundsDialog] = useState<{
        open: boolean;
        investment: LongTermInvestmentItem | null;
    }>({ open: false, investment: null });
    const [addFundsAmount, setAddFundsAmount] = useState<string>("");
    const [addFundsError, setAddFundsError] = useState<string | null>(null);
    const [withdrawDialog, setWithdrawDialog] = useState<{
        open: boolean;
        investment: LongTermInvestmentItem | null;
    }>({ open: false, investment: null });
    const [withdrawAmount, setWithdrawAmount] = useState<string>("");
    const [withdrawNote, setWithdrawNote] = useState<string>("");
    const [withdrawAcknowledge, setWithdrawAcknowledge] = useState<boolean>(false);
    const [walletWithdrawDialog, setWalletWithdrawDialog] = useState<{
        open: boolean;
    }>({ open: false });
    const [walletWithdrawAmount, setWalletWithdrawAmount] = useState<string>("");
    const [walletWithdrawError, setWalletWithdrawError] = useState<string | null>(null);
    const [moveFundsOpen, setMoveFundsOpen] = useState(false);
    const [moveFundsRoute, setMoveFundsRoute] = useState<"MAIN_TO_COPY" | "COPY_TO_MAIN" | "MAIN_TO_LONG_TERM" | "LONG_TERM_TO_MAIN">("MAIN_TO_LONG_TERM");
    const [depositDialogOpen, setDepositDialogOpen] = useState(false);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    type NoticeSeverity = "success" | "error" | "info";
    const [pageNotice, setPageNotice] = useState<{ severity: NoticeSeverity; message: string } | null>(null);
    const [reservedWithdrawalAmount, setReservedWithdrawalAmount] = useState<number>(0);
    const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
    const [pendingConfirmPlanId, setPendingConfirmPlanId] = useState<string | null>(null);

    useEffect(() => {
        if (!pageNotice) return;
        const timeout = window.setTimeout(() => setPageNotice(null), 6000);
        return () => window.clearTimeout(timeout);
    }, [pageNotice]);

    // Ensure currentUser is fresh when navigating to this page
    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }, [queryClient]);

    // Fetch available plans
    const plansQuery = useQuery({
        queryKey: ["long-term-plans"],
        queryFn: async () => (await LongTermService.longTermListLongTermPlans()).data,
    });

    // Fetch user's current investments
    const investmentsQuery = useQuery({
        queryKey: ["long-term-investments"],
        queryFn: async () => (await LongTermService.longTermListLongTermInvestments()).data,
    });

    const roiHistoryQuery = useQuery({
        queryKey: ["long-term-roi-history"],
        queryFn: async () => (await RoiCalculationsService.roiCalculationsGetLongTermRoiHistory(1, 100)).data ?? [],
    });

    const plans = plansQuery.data ?? [];
    const investments = investmentsQuery.data ?? [];
    const planMap = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);

    const activePlans = useMemo(
        () =>
            (Array.isArray(investments) ? investments : []).filter((inv) => {
                const allocation = Number(inv?.allocation ?? 0);
                const status = (inv?.status ?? "").toString().toUpperCase();
                return status === "ACTIVE" && allocation > 0;
            }),
        [investments]
    );

    const roiEvents = roiHistoryQuery.data ?? [];
    const longTermWalletBalance = Number(user?.long_term_wallet_balance ?? 0);
    const mainWalletBalance = Number(user?.availableBalance ?? user?.balance ?? 0);
    const pendingLongTermWalletWithdrawal = Number(user?.pendingLongTermWalletWithdrawal ?? 0);

    const activePlanIds = useMemo(
        () => new Set(activePlans.map((plan) => plan.id)),
        [activePlans]
    );

    const pendingWithdrawalAmount = useMemo(
        () =>
            investments.reduce(
                (sum, inv) => sum + Number(inv.pending_withdrawal_amount ?? 0),
                0,
            ),
        [investments],
    );

    const planRoiByInvestmentId = useMemo(() => {
        const map = new Map<string, number>();
        roiEvents.forEach((event) => {
            if (event.investmentId && activePlanIds.has(event.investmentId)) {
                const amount = Number(event.amount ?? 0);
                map.set(event.investmentId, (map.get(event.investmentId) ?? 0) + amount);
            }
        });
        return map;
    }, [roiEvents, activePlanIds]);

    const reservedDeduction = Math.max(pendingWithdrawalAmount, reservedWithdrawalAmount);
    const displayLongTermWalletBalance = Math.max(0, longTermWalletBalance - reservedDeduction);


    const hasActivePlans = activePlans.length > 0;
    const investmentsError = (investmentsQuery.error as Error | undefined) || undefined;

    const isLoading = plansQuery.isLoading || investmentsQuery.isLoading || roiHistoryQuery.isLoading;

    const kycStatus = user?.kyc_status;
    const isKycApproved = kycStatus === 'APPROVED';
    const hasZeroLongTermBalance = longTermWalletBalance <= 0 && activePlans.length === 0;

    const userInfo = useMemo(() => (user
        ? {
            name: user.full_name ?? user.email ?? undefined,
            email: user.email ?? undefined,
            avatarUrl: toAbsoluteResource(user.profile_picture_url),
        }
        : null), [user]);

    const getTierColor = (tier?: string): "primary" | "success" | "warning" | "info" => {
        const t = (tier || "").toString().toUpperCase();
        switch (t) {
            case "FOUNDATION":
                return "primary";
            case "GROWTH":
                return "success";
            case "ELITE":
                return "warning";
            default:
                return "info";
        }
    };

    const getTierDescription = (tier: string) => {
        switch (tier.toUpperCase()) {
            case "FOUNDATION":
                return "Entry-level plan with steady, conservative returns suitable for beginners";
            case "GROWTH":
                return "Balanced growth strategy with moderate risk-reward for intermediate investors";
            case "ELITE":
                return "Premium plan with aggressive growth targeting experienced investors";
            default:
                return "Investment plan for long-term wealth building";
        }
    };

    const handleSelectPlan = (planId: string) => {
        const plan = plans.find((p) => p.id === planId);
        if (!plan) return;
        const minDeposit = Number(plan.minimum_deposit ?? 0);
        const canCoverWithLongTerm = longTermWalletBalance >= minDeposit;
        const canCoverWithMain = mainWalletBalance >= minDeposit;

        if (canCoverWithLongTerm) {
            setSelectedPlanId(planId);
            setAllocationDialogOpen(true);
            return;
        }

        if (canCoverWithMain) {
            setPendingConfirmPlanId(planId);
            setTransferConfirmOpen(true);
            return;
        }
    };

    const handleAllocationSuccess = () => {
        setAllocationDialogOpen(false);
        setSelectedPlanId(null);
        investmentsQuery.refetch();
        setTimeout(() => {
            navigate({ to: "/dashboard" });
        }, 1000);
    };

    const addFundsMutation = useMutation({
        mutationFn: ({ investmentId, amount }: { investmentId: string; amount: number }) =>
            increaseLongTermEquity({
                user_investment_id: investmentId,
                amount,
            }),
        onMutate: async ({ amount }) => {
            await queryClient.cancelQueries({ queryKey: ["currentUser"] });
            const previousUser = queryClient.getQueryData(["currentUser"]);
            if (previousUser) {
                queryClient.setQueryData(["currentUser"], (old) => {
                    if (!old) return old;
                    const current = { ...(old as Record<string, unknown>) };
                    const currentBalance = Number(current.long_term_wallet_balance ?? 0);
                    current.long_term_wallet_balance = Math.max(0, currentBalance - amount);
                    return current;
                });
            }
            return { previousUser };
        },
        onSuccess: () => {
            setAddFundsError(null);
            setAddFundsAmount("");
            setAddFundsDialog({ open: false, investment: null });
            queryClient.invalidateQueries({ queryKey: ["long-term-investments"] });
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
            setPageNotice({
                severity: "success",
                message: "Funds added successfully. Balances will refresh shortly.",
            });
        },
        onError: (error: unknown, _variables, context) => {
            if (context?.previousUser) {
                queryClient.setQueryData(["currentUser"], context.previousUser);
            }
            let message = "Failed to add funds";
            if (error instanceof ApiError) {
                const errorBody = error.body as Record<string, unknown>;
                message = (errorBody?.detail as string) ?? error.message ?? message;
            } else if (error instanceof Error) {
                message = error.message;
            }
            setAddFundsError(message);
        },
    });

    const withdrawMutation = useMutation({
        mutationFn: (payload: {
            investmentId: string;
            amount?: number;
            note?: string;
            acknowledgePolicy: boolean;
        }) =>
            requestActiveInvestmentWithdrawal(payload),
        onMutate: async (payload) => {
            await queryClient.cancelQueries({ queryKey: ["currentUser"] });
            const previousUser = queryClient.getQueryData(["currentUser"]);
            const amount = Number(payload.amount ?? 0);
            if (amount > 0) {
                setReservedWithdrawalAmount((prev) => prev + amount);
                queryClient.setQueryData(["currentUser"], (old) => {
                    if (!old) return old;
                    const next = { ...(old as Record<string, unknown>) };
                    const current = Number(next.long_term_wallet_balance ?? 0);
                    next.long_term_wallet_balance = Math.max(0, current - amount);
                    return next;
                });
            }
            return { previousUser, amount };
        },
        onSuccess: () => {
            setWithdrawError(null);
            setWithdrawDialog({ open: false, investment: null });
            setWithdrawAmount("");
            setWithdrawNote("");
            setWithdrawAcknowledge(false);
            queryClient.invalidateQueries({ queryKey: ["long-term-investments"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
            setPageNotice({
                severity: "success",
                message:
                    "Withdrawal request submitted successfully. Awaiting approval (typically 48 hours).",
            });
        },
        onError: (error: unknown, _variables, context: { previousUser?: unknown; amount?: number } | undefined) => {
            if (context?.previousUser) {
                queryClient.setQueryData(["currentUser"], context.previousUser);
            }
            if (context?.amount) {
                setReservedWithdrawalAmount((prev) => Math.max(0, prev - context.amount!));
            }
            let message = "Failed to submit withdrawal request";
            if (error instanceof ApiError) {
                const errorBody = error.body as Record<string, unknown>;
                message = (errorBody?.detail as string) ?? error.message ?? message;
            } else if (error instanceof Error) {
                message = error.message;
            }
            setWithdrawError(message);
        },
    });

    const walletWithdrawalMutation = useMutation({
        mutationFn: (payload: { amount: number; description?: string }) =>
            requestLongTermWalletWithdrawal(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["long-term-investments"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
            setPageNotice({
                severity: "success",
                message:
                    "Withdrawal request submitted successfully. Awaiting admin approval (typically 48 hours).",
            });
        },
        onError: (error: unknown) => {
            let message = "Failed to submit withdrawal request";
            if (error instanceof ApiError) {
                const errorBody = error.body as Record<string, unknown>;
                message = (errorBody?.detail as string) ?? error.message ?? message;
            } else if (error instanceof Error) {
                message = error.message;
            }
            setPageNotice({
                severity: "error",
                message,
            });
        },
    });

    const handleOpenAddFundsDialog = (investment: LongTermInvestmentItem) => {
        setAddFundsDialog({ open: true, investment });
        setAddFundsAmount("");
        setAddFundsError(null);
        addFundsMutation.reset();
    };

    const handleCloseAddFundsDialog = () => {
        if (addFundsMutation.isPending) return;
        setAddFundsDialog({ open: false, investment: null });
        setAddFundsAmount("");
        setAddFundsError(null);
        addFundsMutation.reset();
    };

    const handleSubmitAddFunds = () => {
        if (!addFundsDialog.investment) return;
        const amt = parseFloat(addFundsAmount);
        if (!Number.isFinite(amt) || amt <= 0) {
            setAddFundsError("Enter a valid positive amount.");
            return;
        }
        if (amt > longTermWalletBalance) {
            setAddFundsError("Amount exceeds long-term wallet balance. Transfer funds into the long-term wallet first.");
            return;
        }
        const planForSubmit = planMap.get(addFundsDialog.investment.plan_id);
        const planLimit = planForSubmit?.maximum_deposit;
        const currentAllocation = Number(addFundsDialog.investment.allocation ?? 0);
        if (planLimit != null && currentAllocation + amt > planLimit) {
            setAddFundsError(`Deposit would exceed the plan cap of ${formatCurrency(planLimit)}.`);
            return;
        }
        setAddFundsError(null);
        addFundsMutation.mutate({
            investmentId: addFundsDialog.investment.id as string,
            amount: amt,
        });
    };

    const handleOpenWithdrawDialog = (investment: LongTermInvestmentItem) => {
        setWithdrawDialog({ open: true, investment });
        setWithdrawAmount((investment.allocation ?? 0).toString());
        setWithdrawNote("");
        setWithdrawAcknowledge(false);
        setWithdrawError(null);
        withdrawMutation.reset();
    };

    const handleCloseWithdrawDialog = () => {
        if (withdrawMutation.isPending) return;
        setWithdrawDialog({ open: false, investment: null });
        setWithdrawAmount("");
        setWithdrawNote("");
        setWithdrawAcknowledge(false);
        setWithdrawError(null);
        withdrawMutation.reset();
    };

    const handleSubmitWithdrawal = () => {
        if (!withdrawDialog.investment) return;
        const amount = parseFloat(withdrawAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setWithdrawError("Enter a valid positive amount.");
            return;
        }
        const currentAllocation = Number(withdrawDialog.investment.allocation ?? 0);
        if (amount > currentAllocation) {
            setWithdrawError("Amount exceeds current allocation.");
            return;
        }
        const dueDate = withdrawDialog.investment.investment_due_date
            ? new Date(withdrawDialog.investment.investment_due_date)
            : null;
        const isEarly = dueDate ? dueDate.getTime() > Date.now() : false;
        if (isEarly && !withdrawAcknowledge) {
            setWithdrawError("Please acknowledge the early withdrawal policy to continue.");
            return;
        }
        setWithdrawError(null);
        withdrawMutation.mutate({
            investmentId: withdrawDialog.investment.id as string,
            amount,
            note: withdrawNote.trim() || undefined,
            acknowledgePolicy: isEarly ? withdrawAcknowledge : true,
        });
    };

    const handleOpenWalletWithdrawDialog = () => {
        setWalletWithdrawDialog({ open: true });
        setWalletWithdrawAmount("");
        setWalletWithdrawError(null);
    };

    const handleCloseWalletWithdrawDialog = () => {
        setWalletWithdrawDialog({ open: false });
        setWalletWithdrawAmount("");
        setWalletWithdrawError(null);
    };

    const handleSubmitWalletWithdrawal = () => {
        const amount = parseFloat(walletWithdrawAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setWalletWithdrawError("Enter a valid positive amount.");
            return;
        }
        if (amount > longTermWalletBalance) {
            setWalletWithdrawError("Amount exceeds Long-Term Wallet balance.");
            return;
        }
        setWalletWithdrawError(null);
        walletWithdrawalMutation.mutate({
            amount,
            description: "Withdrawal from long-term wallet",
        });
        handleCloseWalletWithdrawDialog();
    };

    return (
        <MaterialDashboardLayout
            title="Long-Term Investment Plans"
            subtitle="Build wealth with strategic long-term investments"
            navigation={USER_NAVIGATION}
            user={userInfo}
            onLogout={logout}
            actions={null}
        >
            <Stack spacing={DASHBOARD_GRID_SPACING}>
                {pageNotice && (
                    <Alert
                        severity={pageNotice.severity}
                        onClose={() => setPageNotice(null)}
                        sx={{ borderRadius: 2 }}
                    >
                        {pageNotice.message}
                    </Alert>
                )}

                {!pageNotice && investmentsQuery.isError && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                        {investmentsError?.message ?? "Unable to load your long-term investments right now."}
                    </Alert>
                )}

                {/* KYC Banner */}
                {!isKycApproved && (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        Long-term allocations require KYC approval. Please{' '}
                        <a href="/kyc" className="underline">complete KYC</a>
                        {kycStatus === 'UNDER_REVIEW' ? ' (Your documents are under review)' : ''}.
                    </Alert>
                )}

                {/* Empty State Guidance for New Users */}
                {hasZeroLongTermBalance && isKycApproved && (
                    <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack spacing={2} alignItems="center" textAlign="center">
                                <Box
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: '50%',
                                        bgcolor: (theme) => theme.palette.mode === 'dark' 
                                            ? 'rgba(0, 150, 255, 0.15)' 
                                            : 'rgba(0, 150, 255, 0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <TrendingUpOutlinedIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" gutterBottom fontWeight={700}>
                                        Ready to start long-term investing?
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Transfer funds to your long-term wallet or make a deposit to begin building wealth.
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1.5}>
                                    <Button
                                        variant="contained"
                                        onClick={() => {
                                            setMoveFundsRoute("MAIN_TO_LONG_TERM");
                                            setMoveFundsOpen(true);
                                        }}
                                    >
                                        Transfer Funds
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => setDepositDialogOpen(true)}
                                    >
                                        Make Deposit
                                    </Button>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                )}

                {/* Quick Actions Bar */}
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mr: 'auto' }}>
                                Quick Actions
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                    setMoveFundsRoute("MAIN_TO_LONG_TERM");
                                    setMoveFundsOpen(true);
                                }}
                            >
                                Transfer to Long-Term
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setDepositDialogOpen(true)}
                            >
                                Deposit Funds
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                    const csvContent = [
                                        ['Investment', 'Tier', 'Allocation', 'ROI', 'ROI %', 'Due Date', 'Status'].join(','),
                                        ...activePlans.map((inv) => [
                                            inv.plan_name || 'N/A',
                                            inv.plan_tier || 'N/A',
                                            inv.allocation || 0,
                                            planRoiByInvestmentId.get(inv.id) || 0,
                                            (((planRoiByInvestmentId.get(inv.id) || 0) / Number(inv.allocation || 1)) * 100).toFixed(2),
                                            inv.investment_due_date || 'Flexible',
                                            inv.status || 'ACTIVE'
                                        ].join(','))
                                    ].join('\n');
                                    const blob = new Blob([csvContent], { type: 'text/csv' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `long-term-investments-${new Date().toISOString().split('T')[0]}.csv`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                disabled={activePlans.length === 0}
                            >
                                Export CSV
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Wallet Actions */}
                {longTermWalletBalance <= 0 && !hasZeroLongTermBalance && (
                    <Alert
                        severity="info"
                        icon={<InfoOutlinedIcon />}
                        sx={{ borderRadius: 2 }}
                    >
                        Your long-term wallet is empty. Transfer funds from your main wallet to start investing.
                    </Alert>
                )}

                {/* Active Plans Section */}
                {hasActivePlans && (
                    <Box>
                        <Typography variant="h6" fontWeight={700} mb={2}>
                            Your Active Investments
                        </Typography>
                        <Grid container spacing={2}>
                            {activePlans.map((investment) => {
                                const allocationValue = Number(investment.allocation ?? 0);
                                const planDetails = planMap.get(investment.plan_id);
                                const planMax = planDetails?.maximum_deposit;
                                const planReachedMax = planMax != null && allocationValue >= planMax;
                                const remainingToMax = planMax != null ? Math.max(0, planMax - allocationValue) : null;
                                const planPnl =
                                    planRoiByInvestmentId.get(investment.id) ??
                                    planRoiByInvestmentId.get(investment.plan_name ?? "") ??
                                    0;
                                const planPnlPercent = allocationValue > 0 ? (planPnl / allocationValue) * 100 : 0;
                                const dueDate = investment.investment_due_date
                                    ? new Date(investment.investment_due_date)
                                    : null;
                                const dueDateLabel = dueDate
                                    ? dueDate.toLocaleDateString(undefined, { dateStyle: "medium" })
                                    : "Flexible";
                                const lockDurationLabel =
                                    investment.lock_duration_months && investment.lock_duration_months > 0
                                        ? `${investment.lock_duration_months} ${
                                              investment.lock_duration_months === 1 ? "month" : "months"
                                          }`
                                        : "Flexible";
                                const stillLocked = dueDate ? dueDate.getTime() > Date.now() : false;
                                const hasPendingWithdrawal = Boolean(investment.pending_withdrawal_transaction_id);
                                const pendingMessage =
                                    "withdrawal request submitted successfully awaiting approval, this usually takes 48hrs to review";

                                return (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={investment.id}>
                                        <Card
                                            variant="outlined"
                                            sx={{
                                                borderColor: `${getTierColor(investment.plan_tier)}.main`,
                                                borderWidth: 2,
                                                position: "relative",
                                            }}
                                        >
                                            <CardContent>
                                                <Stack spacing={2}>
                                        <Box
                                            sx={{
                                                            position: "absolute",
                                                            top: 16,
                                                            right: 16,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 0.5,
                                                            color: `${getTierColor(investment.plan_tier)}.main`,
                                                        }}
                                                    >
                                                        <CheckCircleOutlineIcon
                                                            fontSize="small"
                                                            sx={{ color: "success.main" }}
                                                        />
                                                        <Typography variant="caption" fontWeight={600}>
                                                            Active
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        <Typography variant="h6" fontWeight={700}>
                                                            {investment.plan_name}
                                                        </Typography>
                                                        <Chip
                                                            label={investment.plan_tier}
                                                            size="small"
                                                            color={getTierColor(investment.plan_tier)}
                                                            variant="outlined"
                                                            sx={{ mt: 1 }}
                                                        />
                                                        {hasPendingWithdrawal && (
                                                            <Chip
                                                                label="Withdrawal pending"
                                                                size="small"
                                                                color="warning"
                                                                variant="filled"
                                                                sx={{ mt: 1 }}
                                                            />
                                                        )}
                                                    </Box>

                                                    <Box
                                                        sx={{
                                                            pt: 2,
                                                            borderTop: 1,
                                                            borderColor: "divider",
                                                        }}
                                                    >
                                                        <Grid container spacing={2}>
                                                            <Grid size={{ xs: 6 }}>
                                                                <Typography variant="caption" color="text.secondary">Started</Typography>
                                                                <Typography variant="body2" fontWeight={600}>
                                                                    {new Date(investment.started_at).toLocaleDateString()}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid size={{ xs: 6 }}>
                                                                <Typography variant="caption" color="text.secondary">Plan equity</Typography>
                                                                <Typography variant="body2" fontWeight={600}>
                                                                    {formatCurrency(allocationValue)}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid size={{ xs: 12 }}>
                                                                <Typography variant="caption" color="text.secondary">Unlocks</Typography>
                                                                <Typography variant="body2" fontWeight={600}>
                                                                    {dueDateLabel}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {lockDurationLabel} {stillLocked ? "(locked)" : "(unlocked)"}
                                                                </Typography>
                                                            </Grid>
                                                        </Grid>
                                                    </Box>
                                                    <Box
                                                        sx={{
                                                            pt: 2,
                                                            borderTop: 1,
                                                            borderColor: "divider",
                                                        }}
                                                    >
                                                        <Grid container spacing={2}>
                                                            <Grid size={{ xs: 12 }}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Plan PnL
                                                                </Typography>
                                                                <Stack direction="row" spacing={0.5} alignItems="baseline">
                                                                    <Typography
                                                                        variant="body2"
                                                                        fontWeight={600}
                                                                        sx={{ color: planPnl >= 0 ? "success.main" : "error.main" }}
                                                                    >
                                                                        {formatCurrency(planPnl)}
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{ color: planPnl >= 0 ? "success.main" : "error.main" }}
                                                                    >
                                                                        {formatPercentage(planPnlPercent)}
                                                                    </Typography>
                                                                </Stack>
                                                            </Grid>
                                                        </Grid>
                                                    </Box>
                                                    <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                                                        {hasPendingWithdrawal ? (
                                                            <Button
                                                                variant="contained"
                                                                color="primary"
                                                                disabled
                                                                startIcon={<CircularProgress size={16} />}
                                                                sx={{ textTransform: "none", justifyContent: "flex-start" }}
                                                            >
                                                                {pendingMessage}
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Stack direction="row" spacing={1}>
                                                                    <Button
                                                                        size="small"
                                                                        variant="contained"
                                                                        disabled={!isKycApproved || longTermWalletBalance <= 0 || planReachedMax}
                                                                        onClick={() => handleOpenAddFundsDialog(investment)}
                                                                    >
                                                                        Deposit
                                                                    </Button>
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        disabled={!isKycApproved}
                                                                        onClick={() => handleOpenWithdrawDialog(investment)}
                                                                    >
                                                                        Request Withdrawal
                                                                    </Button>
                                                                </Stack>
                                                                {planMax != null && planReachedMax && (
                                                                    <Typography variant="caption" color="warning.main">
                                                                        Plan cap of {formatCurrency(planMax)} reached.
                                                                    </Typography>
                                                                )}
                                                                {planMax != null && !planReachedMax && remainingToMax !== null && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {formatCurrency(remainingToMax)} remaining toward cap.
                                                                    </Typography>
                                                                )}
                                                            </>
                                                        )}
                                                    </Box>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                )}

                {/* Long-Term Wallet */}
                <Box>
                    <Typography variant="h6" fontWeight={700} mb={2}>
                        Long-Term Wallet
                    </Typography>
                    <Card variant="outlined">
                        <CardContent>
                            <Stack spacing={2}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">
                                        Wallet Balance
                                    </Typography>
                                    <Typography variant="h6" fontWeight={700}>
                                        {formatCurrency(displayLongTermWalletBalance)}
                                    </Typography>
                                </Box>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => {
                                            setMoveFundsRoute("MAIN_TO_LONG_TERM");
                                            setMoveFundsOpen(true);
                                        }}
                                    >
                                        Transfer From Main Wallet
                                    </Button>
                                    {longTermWalletBalance > 0 && (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            disabled={!isKycApproved || walletWithdrawalMutation.isPending}
                                            onClick={handleOpenWalletWithdrawDialog}
                                        >
                                            {walletWithdrawalMutation.isPending ? "Submitting..." : "Request Withdrawal to Main Wallet"}
                                        </Button>
                                    )}
                                </Stack>
                                {pendingLongTermWalletWithdrawal > 0 && (
                                    <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
                                        {formatCurrency(pendingLongTermWalletWithdrawal)} pending withdrawal awaiting admin approval.
                                    </Typography>
                                )}
                                {reservedDeduction > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        {formatCurrency(reservedDeduction)} pending withdrawal
                                    </Typography>
                                )}
                                <Typography variant="caption" color="text.secondary">
                                    Admin approval required to move funds to your main wallet.
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Need to top up? Submit a deposit request directly from here without leaving the plans page.
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>

                {/* Available Plans Section */}
                <Box>
                    <Typography variant="h6" fontWeight={700} mb={2}>
                        {hasActivePlans ? "Other Available Plans" : "Available Investment Plans"}
                    </Typography>

                    {isLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : plans.length === 0 ? (
                        <Alert severity="info">No investment plans available at the moment.</Alert>
                    ) : (
                        <Grid container spacing={DASHBOARD_GRID_SPACING}>
                            {plans.map((plan) => {
                                const isAlreadyActive = activePlans.some(
                                    (inv) => inv.plan_id === plan.id && inv.status === "ACTIVE"
                                );
                                const tierColor = getTierColor(plan.tier);

                                return (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={plan.id}>
                                        <Card
                                            variant="outlined"
                                            sx={{
                                                height: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                transition: "all 0.12s ease-in-out",
                                                opacity: isAlreadyActive ? 0.6 : 1,
                                                pointerEvents: isAlreadyActive ? "none" : "auto",
                                                "&:hover": !isAlreadyActive
                                                    ? {
                                                          boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
                                                          borderColor: `${tierColor}.main`,
                                                      }
                                                    : {},
                                            }}
                                        >
                                            <CardHeader
                                                title={
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                        }}
                                                    >
                                                        <Typography variant="h6" fontWeight={700}>
                                                            {plan.name}
                                                        </Typography>
                                                        <Chip
                                                            label={plan.tier}
                                                            color={tierColor}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ fontWeight: 600 }}
                                                        />
                                                    </Box>
                                                }
                                                sx={{ pb: 0 }}
                                            />

                                            <CardContent
                                                sx={{
                                                    flex: 1,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                }}
                                            >
                                                <Stack spacing={3}>
                                                    {/* Description */}
                                                    <Typography variant="body2" color="text.secondary">
                                                        {plan.description ||
                                                            getTierDescription(plan.tier)}
                                                    </Typography>

                                                    {/* Key Metrics */}
                                                    <Box
                                                        sx={(theme) => ({
                                                            p: 2,
                                                            borderRadius: 1,
                                                            bgcolor:
                                                                theme.palette.mode === "dark"
                                                                    ? theme.palette.grey[900]
                                                                    : theme.palette.grey[50],
                                                            border: `1px solid ${
                                                                theme.palette.mode === "dark"
                                                                    ? theme.palette.grey[800]
                                                                    : theme.palette.grey[200]
                                                            }`,
                                                        })}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            display="block"
                                                            gutterBottom
                                                            sx={(theme) => ({
                                                                color:
                                                                    theme.palette.mode === "dark"
                                                                        ? theme.palette.grey[300]
                                                                        : theme.palette.text.secondary,
                                                            })}
                                                        >
                                                            Minimum Deposit
                                                        </Typography>
                                                        <Typography variant="h6" fontWeight={700}>
                                                            {formatCurrency(plan.minimum_deposit)}
                                                        </Typography>
                                                    </Box>

                                                    {/* Plan Features */}
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            display="block"
                                                            gutterBottom
                                                            sx={{ fontWeight: 600 }}
                                                        >
                                                            Plan Features
                                                        </Typography>
                                                        <Stack component="ul" spacing={1}>
                                                            {plan.tier.toUpperCase() === "FOUNDATION" && (
                                                                <>
                                                                    <Typography
                                                                        component="li"
                                                                        variant="caption"
                                                                    >
                                                                        Conservative growth strategy
                                                                    </Typography>
                                                                    <Typography
                                                                        component="li"
                                                                        variant="caption"
                                                                    >
                                                                        Ideal for long-term wealth building
                                                                    </Typography>
                                                                    <Typography
                                                                        component="li"
                                                                        variant="caption"
                                                                    >
                                                                        Lower volatility
                                                                    </Typography>
                                                                </>
                                                            )}
                                                            {plan.tier.toUpperCase() === "GROWTH" && (
                                                                <>
                                                                    <Typography
                                                                        component="li"
                                                                        variant="caption"
                                                                    >
                                                                        Balanced risk and returns
                                                                    </Typography>
                                                                    <Typography
                                                                        component="li"
                                                                        variant="caption"
                                                                    >
                                                                        Active portfolio management
                                                                    </Typography>
                                                                    <Typography
                                                                        component="li"
                                                                        variant="caption"
                                                                    >
                                                                        Regular rebalancing
                                                                    </Typography>
                                                                </>
                                                            )}
                                                            {plan.tier.toUpperCase() === "ELITE" && (
                                                                <>
                                                                    <Typography
                                                                        component="li"
                                                                        variant="caption"
                                                                    >
                                                                        Premium returns targeting
                                                                    </Typography>
                                                                    <Typography
                                                                        component="li"
                                                                        variant="caption"
                                                                    >
                                                                        Advanced investment strategies
                                                                    </Typography>
                                                                    <Typography
                                                                        component="li"
                                                                        variant="caption"
                                                                    >
                                                                        Priority support
                                                                    </Typography>
                                                                </>
                                                            )}
                                                        </Stack>
                                                    </Box>

                                                    {/* Action Button */}
                                                    <Box sx={{ pt: 1, mt: "auto" }}>
                                                    <Button
                                                        variant="contained"
                                                        color={tierColor}
                                                        disabled={
                                                            !isKycApproved ||
                                                            isAlreadyActive ||
                                                            !(longTermWalletBalance >= plan.minimum_deposit ||
                                                                mainWalletBalance >= plan.minimum_deposit)
                                                        }
                                                        onClick={() => handleSelectPlan(plan.id)}
                                                    >
                                                        {(!isKycApproved && 'Complete KYC to invest') ||
                                                            (isAlreadyActive
                                                                ? "Already Active"
                                                                : longTermWalletBalance < plan.minimum_deposit &&
                                                                  mainWalletBalance >= plan.minimum_deposit
                                                                    ? "Move funds from Main Wallet"
                                                                    : longTermWalletBalance < plan.minimum_deposit
                                                                    ? "Insufficient Balance"
                                                                    : "Select Plan")}
                                                    </Button>
                                                    </Box>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}
                </Box>

                {/* Information Footer */}
                <Card variant="outlined" sx={{ bgcolor: "info.lighter", borderColor: "info.light" }}>
                    <CardContent>
                        <Stack spacing={1}>
                            <Typography variant="subtitle2" fontWeight={700}>
                                About Long-Term Investments
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Long-term investment plans are designed to help you build wealth over time.
                                Each plan tier offers different risk-return profiles. Performance metrics are
                                updated regularly to reflect ROI from fund growth. You can actively monitor
                                your investments and switch plans if your investment goals change.
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Deposit Dialog */}
                <Dialog
                    open={addFundsDialog.open}
                    onClose={handleCloseAddFundsDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        Deposit {addFundsDialog.investment ? `to ${addFundsDialog.investment.plan_name}` : ""}
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                Long-Term Wallet Balance: {formatCurrency(longTermWalletBalance)}
                            </Typography>
                            {addFundsDialog.investment && (
                                <Typography variant="body2" color="text.secondary">
                                    Current Allocation: {formatCurrency(addFundsDialog.investment.allocation)}
                                </Typography>
                            )}
                            <TextField
                                label="Amount"
                                type="number"
                                value={addFundsAmount}
                                onChange={(event) => setAddFundsAmount(event.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                    inputProps: { min: 0, step: "0.01" },
                                }}
                                autoFocus
                                disabled={addFundsMutation.isPending}
                            />
                            <Typography variant="caption" color="text.secondary">
                                Funds will be moved from your long-term wallet into this investment.
                            </Typography>
                            {addFundsError && <Alert severity="error">{addFundsError}</Alert>}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseAddFundsDialog} disabled={addFundsMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSubmitAddFunds}
                            disabled={addFundsMutation.isPending || longTermWalletBalance <= 0}
                        >
                            {addFundsMutation.isPending ? "Depositing..." : "Deposit"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Transfer confirmation dialog */}
                <Dialog open={transferConfirmOpen} onClose={() => setTransferConfirmOpen(false)}>
                    <DialogTitle>Move funds to Long-Term Wallet</DialogTitle>
                    <DialogContent>
                        <Typography>
                            You have enough funds in your main wallet. Transfer {pendingConfirmPlanId && plans.find((p) => p.id === pendingConfirmPlanId)?.name}’s required allocation
                            to the long-term wallet before finalizing the plan.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setTransferConfirmOpen(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                if (pendingConfirmPlanId) {
                                    setMoveFundsRoute("MAIN_TO_LONG_TERM");
                                    setMoveFundsOpen(true);
                                    setPageNotice({
                                        severity: "info",
                                        message: "Transfer initiated. Return to the plan and select it once the funds land in the long-term wallet.",
                                    });
                                }
                                setTransferConfirmOpen(false);
                            }}
                        >
                            Proceed to transfer
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Withdrawal Dialog */}
                <Dialog
                    open={withdrawDialog.open}
                    onClose={handleCloseWithdrawDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        {withdrawDialog.investment
                            ? `Request Withdrawal - ${withdrawDialog.investment.plan_name}`
                            : "Request Withdrawal"}
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2}>
                            {withdrawDialog.investment && (
                                (() => {
                                    const dueDate = withdrawDialog.investment?.investment_due_date
                                        ? new Date(withdrawDialog.investment.investment_due_date)
                                        : null;
                                    const isEarly = dueDate ? dueDate.getTime() > Date.now() : false;
                                    const formattedDueDate = dueDate
                                        ? dueDate.toLocaleDateString(undefined, { dateStyle: "medium" })
                                        : null;

                                    return (
                                        <>
                                            <Alert severity={isEarly ? "warning" : "info"}>
                                                {isEarly
                                                    ? `This withdrawal is before the lock period ends (${formattedDueDate}). Extra fees may apply per company policy.`
                                                    : "Matured funds will be returned to your main wallet after admin approval."}
                                            </Alert>
                                            <Typography variant="body2" color="text.secondary">
                                                Investment value: {formatCurrency(withdrawDialog.investment.allocation)}
                                            </Typography>
                                            <TextField
                                                label="Withdrawal Amount"
                                                type="number"
                                                value={withdrawAmount}
                                                onChange={(event) => setWithdrawAmount(event.target.value)}
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                }}
                                                fullWidth
                                                disabled={withdrawMutation.isPending}
                                            />
                                            <TextField
                                                label="Note (optional)"
                                                value={withdrawNote}
                                                onChange={(event) => setWithdrawNote(event.target.value)}
                                                fullWidth
                                                multiline
                                                minRows={2}
                                                disabled={withdrawMutation.isPending}
                                            />
                                            {isEarly && (
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={withdrawAcknowledge}
                                                            onChange={(event) => setWithdrawAcknowledge(event.target.checked)}
                                                            disabled={withdrawMutation.isPending}
                                                        />
                                                    }
                                                    label="I understand early withdrawal may incur fees and requires admin approval."
                                                />
                                            )}
                                        </>
                                    );
                                })()
                            )}
                            {withdrawError && <Alert severity="error">{withdrawError}</Alert>}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseWithdrawDialog} disabled={withdrawMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSubmitWithdrawal}
                            disabled={withdrawMutation.isPending || !withdrawDialog.investment}
                            startIcon={withdrawMutation.isPending ? <CircularProgress size={16} /> : undefined}
                        >
                            {withdrawMutation.isPending ? "Submitting..." : "Submit Withdrawal"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Deposit Dialog */}
                <Dialog
                    open={depositDialogOpen}
                    onClose={() => setDepositDialogOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>Deposit Funds to Main Wallet</DialogTitle>
                    <DialogContent dividers sx={{ bgcolor: "background.default" }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Submit a deposit request. Once approved by an admin, funds will appear in your
                            available balance and can be allocated to long-term plans.
                        </Typography>
                        <DepositRequest
                            onSuccess={() => {
                                setDepositDialogOpen(false);
                                setPageNotice({
                                    severity: "success",
                                    message: "Deposit request submitted. Check your account history for updates.",
                                });
                            }}
                            onError={(error) => {
                                setPageNotice({
                                    severity: "error",
                                    message: error?.message ?? "Failed to submit deposit request.",
                                });
                            }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => setDepositDialogOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Wallet Withdrawal Dialog */}
                <Dialog
                    open={walletWithdrawDialog.open}
                    onClose={(_, reason) => {
                        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
                        handleCloseWalletWithdrawDialog();
                    }}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Withdraw from Long-Term Wallet</DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                Submit a withdrawal request from your Long-Term Wallet. The request will be
                                reviewed by an admin (typically within 48 hours).
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                                Available Balance: {formatCurrency(longTermWalletBalance)}
                            </Typography>
                            <TextField
                                label="Withdrawal Amount (USD)"
                                type="number"
                                value={walletWithdrawAmount}
                                onChange={(e) => setWalletWithdrawAmount(e.target.value)}
                                fullWidth
                                placeholder="100.00"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                }}
                                disabled={walletWithdrawalMutation.isPending}
                            />
                            {walletWithdrawError && <Alert severity="error">{walletWithdrawError}</Alert>}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseWalletWithdrawDialog} disabled={walletWithdrawalMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSubmitWalletWithdrawal}
                            disabled={walletWithdrawalMutation.isPending}
                            startIcon={walletWithdrawalMutation.isPending ? <CircularProgress size={16} /> : undefined}
                        >
                            {walletWithdrawalMutation.isPending ? "Submitting..." : "Submit Withdrawal"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Allocation Dialog */}
                {selectedPlanId && (
                    <LongTermAllocation
                        open={allocationDialogOpen}
                        onClose={() => {
                            setAllocationDialogOpen(false);
                            setSelectedPlanId(null);
                        }}
                        onSuccess={handleAllocationSuccess}
                        preSelectedPlanId={selectedPlanId}
                        onRequestTopUp={() => {
                            setMoveFundsRoute("MAIN_TO_LONG_TERM");
                            setMoveFundsOpen(true);
                        }}
                    />
                )}

                <MoveFundsDrawer
                    open={moveFundsOpen}
                    onClose={() => {
                        setMoveFundsOpen(false);
                        setMoveFundsRoute("MAIN_TO_LONG_TERM");
                    }}
                    initialRoute={moveFundsRoute}
                />
            </Stack>
        </MaterialDashboardLayout>
    );
}
