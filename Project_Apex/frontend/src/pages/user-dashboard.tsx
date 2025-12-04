import { useEffect, useMemo, type ReactNode } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import {
    Box,
    Button,
    Grid,
    Skeleton,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    alpha,
} from "@mui/material";
import ArrowForwardIosRounded from "@mui/icons-material/ArrowForwardIosRounded";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import WalletOutlinedIcon from "@mui/icons-material/WalletOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { KycStatusBanner } from "@/components/dashboard/kyc-status-banner";
import { useAuth } from "@/providers/auth-provider";
import { UsersService } from "@/api/services/UsersService";
import { PerformanceService } from "@/api/services/PerformanceService";
import { TradesService } from "@/api/services/TradesService";
import type { DailyPerformancePublic } from "@/api/models/DailyPerformancePublic";
import { TransactionsService } from "@/api/services/TransactionsService";
import { CopyTradingService } from "@/api/services/CopyTradingService";
import { MaterialDashboardLayout, type MaterialDashboardNavItem } from "@/components/layouts/material-dashboard";
import { CopyTradingHistory } from "@/components/dashboard/copy-trading-history";
import { ActiveCopyPositionsImproved } from "@/components/dashboard/active-copy-positions-improved";
import { ROIChart } from "@/components/dashboard/roi-chart";
import { fetchCryptoPrices, getDefaultCoinIds } from "@/services/coingecko";
import { MetricCard, Panel, StatCardSkeleton, TableSkeleton } from "@/components/shared";
import { Link } from "@tanstack/react-router";
import { toAbsoluteResource } from "@/utils/url";
import { useDashboardStore } from "@/stores/dashboard-store";
import { formatCurrencyByPreference } from "@/utils/currency";
import { DASHBOARD_GRID_SPACING } from "@/constants/layout";
import { PendingDepositsBanner } from "@/components/dashboard/pending-deposits-banner";
import { PendingApprovalBanner } from "@/components/dashboard/pending-approval-banner";
import TradingViewTickerTape from "@/components/widgets/tradingview-ticker-tape";
import { RoiCalculationsService } from "@/api/services/RoiCalculationsService";

export const UserDashboard = ({ children }: { children?: ReactNode }) => {
    const { user, logout, isAdmin } = useAuth();
    const userId = user?.id;
    const { pathname } = useLocation();
    const normalizedPathname =
        pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
    const isRootDashboard = normalizedPathname === "/dashboard";

    // Get currency preference from store
    const preferredCurrency = useDashboardStore((s) => s.preferredCurrency);
    
    // Currency formatting function
    const formatCurrency = (value: number) => formatCurrencyByPreference(value, preferredCurrency);
    
    /**
     * Format a date as relative time (e.g., "2h ago")
     */
    const formatRelativeTime = (date: Date | string): string => {
        const d = typeof date === "string" ? new Date(date) : date;
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString();
    };

    const accountSummaryQuery = useQuery({
        queryKey: ["account-summary", userId],
        queryFn: () => UsersService.usersGetAccountSummary(userId!),
        enabled: Boolean(userId) && isRootDashboard,
    });

    const tradesQuery = useQuery({
        queryKey: ["trades", userId],
        queryFn: () => TradesService.tradesReadTrades(0, 10),
        enabled: Boolean(userId) && isRootDashboard,
    });

    const performanceQuery = useQuery({
        queryKey: ["daily-performance", userId],
        queryFn: () => PerformanceService.performanceReadPerformance(0, 15),
        enabled: Boolean(userId) && isRootDashboard,
    });

    const transactionsQuery = useQuery({
        queryKey: ["transactions", userId],
        queryFn: () => TransactionsService.transactionsReadTransactions(0, 10),
        enabled: Boolean(userId) && isRootDashboard,
        refetchInterval: 15000, // Poll every 15s
    });

    // Poll for user data updates (balances) while on dashboard
    useQuery({
        queryKey: ["currentUser"],
        queryFn: () => UsersService.usersReadUserMe(),
        enabled: isRootDashboard,
        refetchInterval: 15000, // Poll every 15s
    });

    // Market prices temporarily disabled (service not present)
    const marketDataQuery = { isLoading: false } as const;

    // Get copy trading history count for telemetry
    const copyTradingHistoryQuery = useQuery({
        queryKey: ["copy-trading-history-count"],
        queryFn: () => CopyTradingService.copyTradingGetCopyTradingHistory(1, 1),
        enabled: Boolean(userId) && isRootDashboard,
    });

    // Fetch copy trading history for last 30 days (page 1, 100 items should cover ~30 days)
    const copyTradingHistoryFullQuery = useQuery({
        queryKey: ["copy-trading-history-full", userId],
        queryFn: () => CopyTradingService.copyTradingGetCopyTradingHistory(1, 100),
        enabled: Boolean(userId) && isRootDashboard,
        refetchInterval: 30000,
    });

    const unifiedRoiQuery = useQuery({
        queryKey: ["unified-roi", "dashboard-card"],
        queryFn: () => RoiCalculationsService.roiCalculationsGetUnifiedRoi(undefined),
        enabled: isRootDashboard,
        staleTime: 60000,
    });

    const summary = accountSummaryQuery.data;
    const trades = tradesQuery.data?.data ?? [];
    
    // Aggregate copy trading history by date to create daily performance
    const dailyPerformanceFromExecutions = useMemo(() => {
        const events = copyTradingHistoryFullQuery.data?.data ?? [];
        const byDate = new Map<string, number>();

        for (const event of events) {
            const amount = Number(event.amount ?? 0);
            if (!Number.isFinite(amount)) continue;

            const eventDate = new Date(event.created_at);
            const dateKey = eventDate.toISOString().split("T")[0]; // YYYY-MM-DD
            byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + amount);
        }

        // Convert to daily performance entries (sorted by date descending)
        return Array.from(byDate.entries())
            .map(([date, amount]) => ({
                id: `${date}-aggregated`,
                performance_date: date,
                profit_loss: amount,
                created_at: new Date(date).toISOString(),
                user_id: userId || "",
            }))
            .sort((a, b) => new Date(b.performance_date).getTime() - new Date(a.performance_date).getTime());
    }, [copyTradingHistoryFullQuery.data, userId]);

    const latestDailyProfit = dailyPerformanceFromExecutions[0]?.profit_loss ?? 0;
    const kycStatus = (user?.kyc_status as string | undefined) ?? "PENDING";
    const isKycApproved = kycStatus === "APPROVED";
    const isKycPending = kycStatus === "PENDING";
    const isKycUnderReview = kycStatus === "UNDER_REVIEW";

    // Time-range filter state from Zustand store (persistent across reloads)
    const timeRange = useDashboardStore((s) => s.selectedTimeRange);
    const setTimeRange = useDashboardStore((s) => s.setTimeRange);

    // Fetch real-time crypto prices from CoinGecko API
    const marketPricesQuery = useQuery({
        queryKey: ['market-prices', 'coingecko'],
        queryFn: () => fetchCryptoPrices(getDefaultCoinIds()),
        enabled: isRootDashboard,
        refetchInterval: 60000, // Refetch every 60 seconds
        staleTime: 30000, // Consider data stale after 30 seconds
    });

    // Filter daily performance by selected time range
    const filteredPerformance = useMemo(() => {
        const now = new Date();
        const cutoffDate = new Date();

        if (timeRange === "7d") {
            cutoffDate.setDate(now.getDate() - 7);
        } else if (timeRange === "30d") {
            cutoffDate.setDate(now.getDate() - 30);
        }
        // else: "all" - no filter

        return dailyPerformanceFromExecutions.filter((entry) => {
            const entryDate = new Date(entry.performance_date);
            return timeRange === "all" || entryDate >= cutoffDate;
        });
    }, [dailyPerformanceFromExecutions, timeRange]);

    // Prepare ROI chart data from daily performance
    const roiChartData = useMemo(() => {
        const data = filteredPerformance
            .slice()
            .reverse() // Show chronologically for chart
            .map((entry) => ({
                date: entry.performance_date,
                roi: Number(entry.profit_loss),
                label: new Date(entry.performance_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            }));
        
        // Calculate cumulative ROI
        let cumulative = 0;
        return data.map(item => {
            cumulative += item.roi;
            return { ...item, roi: cumulative };
        });
    }, [filteredPerformance]);

    const isLoading =
        isRootDashboard &&
        (accountSummaryQuery.isLoading ||
            tradesQuery.isLoading ||
            performanceQuery.isLoading ||
            transactionsQuery.isLoading ||
            marketDataQuery.isLoading);

    const totalWalletValue =
        (user?.availableBalance ?? user?.balance ?? 0) +
        (user?.copy_trading_wallet_balance ?? 0) +
        (user?.long_term_wallet_balance ?? 0) +
        (user?.allocatedCopyBalance ?? 0) +
        (user?.longTermBalance ?? 0);

    const isNewUser =
        totalWalletValue <= 0 &&
        !isKycApproved &&
        !isKycUnderReview;

    const hasZeroBalance = totalWalletValue <= 0;

    const portfolioTelemetry = useMemo(() => {
        if (!isRootDashboard) {
            return [];
        }

        const walletBalance = user?.availableBalance ?? user?.balance ?? 0;
        const copyTradingWalletBalance = user?.copy_trading_wallet_balance ?? 0;
        const longTermWalletBalance = user?.long_term_wallet_balance ?? 0;
        const copyTradingBalance = user?.allocatedCopyBalance ?? 0;
        const longTermBalance = user?.longTermBalance ?? 0;
        const totalBalance =
            walletBalance +
            copyTradingWalletBalance +
            longTermWalletBalance +
            copyTradingBalance +
            longTermBalance;

        const overallRoiAmount = unifiedRoiQuery.data?.actively_invested_profit_loss ?? 0;
        const hasRoi = unifiedRoiQuery.isSuccess;

        // Calculate strategy allocation percentages
        const walletAllocationPercent = totalBalance > 0 ? (walletBalance / totalBalance) * 100 : 0;

        return [
            // Order emphasises total holdings first, then liquid funds, then longer-term allocations.
            {
                title: "Total Portfolio Value",
                value: formatCurrency(totalBalance),
                icon: TrendingUpOutlinedIcon,
                secondaryText: hasRoi
                    ? `Overall ROI: ${formatCurrency(overallRoiAmount)}`
                    : "Overall ROI: --",
                color: "primary" as const,
            },
            {
                title: "Main Wallet",
                value: formatCurrency(walletBalance),
                icon: AccountBalanceOutlinedIcon,
                secondaryText: `${walletAllocationPercent.toFixed(1)}% available for trading`,
                color: "info" as const,
            },
            {
                title: "Long-Term Wallet",
                value: formatCurrency(longTermWalletBalance),
                icon: WalletOutlinedIcon,
                secondaryText: `${formatCurrency(longTermBalance)} currently allocated to plans`,
                color: "success" as const,
            },
            {
                title: "Copy Trading Wallet",
                value: formatCurrency(copyTradingWalletBalance),
                icon: PeopleOutlinedIcon,
                secondaryText: `${formatCurrency(copyTradingBalance)} currently allocated to copy trading`,
                color: "primary" as const,
            },
        ];
    }, [copyTradingHistoryQuery.data?.count, isRootDashboard, summary, trades, user]);

    // Temporary validation: log wallet balances from API
    useEffect(() => {
        if (user) {
            // These should default to 0 and be present on the user object
            console.log("copy_trading_wallet_balance:", user.copy_trading_wallet_balance);
            console.log("long_term_wallet_balance:", user.long_term_wallet_balance);
        }
    }, [user?.id, user?.copy_trading_wallet_balance, user?.long_term_wallet_balance]);

    const renderDailyPerformance = (entries: DailyPerformancePublic[]) => {
        if (!entries.length) {
            return (
                <Box py={8} textAlign="center">
                    <TrendingUpOutlinedIcon sx={{ fontSize: 32, color: "text.secondary", mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                        No copy trading activity in this period
                    </Typography>
                    <Button
                        size="small"
                        component={Link}
                        to="/dashboard/copy-trading"
                        sx={{ mt: 2 }}
                        variant="outlined"
                    >
                        Start copy trading
                    </Button>
                </Box>
            );
        }

        return (
            <Stack spacing={2}>
                {entries.map((entry) => (
                    <Box
                        key={entry.id}
                        sx={{
                            border: "none",
                            boxShadow: (theme) => theme.shadows[1], // shadows.low
                            borderRadius: '12px', // C1 precise geometry
                            p: 3,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            transition: "box-shadow 0.12s ease-in-out",
                            "&:hover": {
                                boxShadow: (theme) => theme.shadows[2], // shadows.medium on hover
                            },
                        }}
                    >
                        <Box>
                            <Typography variant="body1" fontWeight={600}>
                                {entry.performance_date}
                            </Typography>
                            <Tooltip title={new Date(entry.created_at).toLocaleString()}>
                                <Typography variant="caption" color="text.secondary" sx={{ cursor: "help" }}>
                                    Recorded {formatRelativeTime(entry.created_at)}
                                </Typography>
                            </Tooltip>
                        </Box>
                        <Box
                            sx={{
                                px: 2,
                                py: 1,
                                borderRadius: 1,
                                bgcolor: (theme) => entry.profit_loss >= 0 
                                    ? alpha(theme.palette.success.main, 0.1) 
                                    : alpha(theme.palette.error.main, 0.1),
                                color: entry.profit_loss >= 0 ? "success.main" : "error.main",
                            }}
                        >
                            <Typography variant="body2" fontWeight={600}>
                                {formatCurrency(entry.profit_loss)}
                            </Typography>
                        </Box>
                    </Box>
                ))}
                {/* CTA below analytics */}
                <Box sx={{ pt: 2, textAlign: "center" }}>
                    <Button
                        size="small"
                        component={Link}
                        to="/dashboard/copy-trading"
                        variant="outlined"
                    >
                        View all activity
                    </Button>
                </Box>
            </Stack>
        );
    };

    const heroTitle = isKycApproved
        ? "You're verified"
        : isKycUnderReview
        ? "KYC under review"
        : isNewUser
        ? "Start your first move"
        : "Stay in sync with your next move";
    const heroSubtitle = isKycApproved
        ? "Identity confirmed. Keep tracking ROI, wallet balances, and long-term plans with confidence."
        : isKycUnderReview
        ? "We received your documents and are reviewing them. We'll update you as soon as the verification is complete."
        : isNewUser
        ? "Complete verification and add funds to unlock deposits, withdrawals, and higher trading limits."
        : "Track ROI, wallet balances, and KYC status with the same dark/cyan clarity as the landing experience.";
    const primaryCtaLabel = isKycApproved
        ? "Explore plans"
        : isKycUnderReview
        ? "View verification"
        : isNewUser
        ? "Start verification"
        : "Verify identity";
    const primaryCtaTo = isKycApproved ? "/plans" : "/kyc";
    const showSecondaryCta = isNewUser;
    const secondaryCtaLabel = isNewUser ? "Explore plans" : "View copy trading";
    const secondaryCtaTo = isNewUser ? "/plans" : "/dashboard/copy-trading";
    const showKycStatusBanner = !isKycPending && !isKycApproved && !isKycUnderReview;

    const overviewContent = (
        <>
            <Box sx={{ mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.3px' }}>
                    Welcome back, {user?.full_name ?? user?.email ?? 'trader'}
                </Typography>
            </Box>
            <Box
                sx={(theme) => ({
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 3,
                    p: { xs: 2.75, md: 3.5 },
                    mb: 3,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
                    background: `radial-gradient(circle at 15% 20%, ${alpha(theme.palette.primary.main, 0.14)}, transparent 38%), linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.background.paper, 0.94)})`,
                    boxShadow: `0 30px 80px -60px ${alpha(theme.palette.primary.main, 0.8)}`,
                })}
            >
                <Box
                    sx={(theme) => ({
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.08)}, transparent)`,
                    })}
                />
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2.5}
                    alignItems={{ xs: "flex-start", md: "center" }}
                    justifyContent="space-between"
                >
                    <Stack spacing={0.75} sx={{ maxWidth: 760 }}>
                        <Typography
                            variant="h5"
                            sx={(theme) => ({
                                background: `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.9)}, ${alpha(theme.palette.primary.main, 0.6)})`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            })}
                        >
                            {heroTitle}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {heroSubtitle}
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.25} flexWrap="wrap" sx={{ alignItems: "center" }}>
                        {(!isKycUnderReview || !isNewUser) && (
                            <Button
                                component={Link}
                                to={primaryCtaTo}
                                variant="contained"
                                size="medium"
                                endIcon={<ArrowForwardIosRounded fontSize="inherit" />}
                            >
                                {primaryCtaLabel}
                            </Button>
                        )}
                        {showSecondaryCta && !isKycUnderReview && (
                            <Button
                                component={Link}
                                to={secondaryCtaTo}
                                variant="outlined"
                                size="medium"
                                color="inherit"
                            >
                                {secondaryCtaLabel}
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Box>

            {/* Market Ticker */}
            {isRootDashboard && (
                <Box
                    sx={(theme) => ({
                        borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
                        bgcolor: alpha(theme.palette.background.default, 0.16),
                        p: { xs: 1.5, md: 2 },
                        mb: 2,
                    })}
                >
                    <TradingViewTickerTape displayMode="adaptive" transparent />
                </Box>
            )}

            {/* KYC Status Banner */}
            {isKycPending || isKycUnderReview ? (
                <PendingApprovalBanner
                    title={isKycUnderReview ? "KYC under review" : "Identity verification pending"}
                    description={
                        isKycUnderReview
                            ? "Our compliance team is reviewing your documents. Hang tight—we’ll notify you once it’s approved."
                            : "Submit your documents to unlock deposits, withdrawals, and higher trading limits."
                    }
                    icon={<FactCheckOutlinedIcon fontSize="inherit" />}
                    severity="warning"
                    items={[
                        {
                            id: userId ?? "kyc-status",
                        },
                    ]}
                    renderItem={() => (
                        <Stack spacing={0.75}>
                            <Typography variant="subtitle2">
                                {isKycUnderReview ? "Review in progress" : "Verification requested"}
                            </Typography>
                            {user?.kyc_submitted_at && (
                                <Typography variant="caption" color="text.secondary">
                                    Submitted: {new Date(user.kyc_submitted_at).toLocaleString()}
                                </Typography>
                            )}
                            <Button
                                component={Link}
                                to="/kyc"
                                variant="contained"
                                size="small"
                            >
                                {isKycUnderReview ? "View submission" : "Complete verification"}
                            </Button>
                        </Stack>
                    )}
                />
            ) : (
                showKycStatusBanner && <KycStatusBanner />
            )}
            <PendingDepositsBanner />

            {/* Quick Actions Bar */}
            {isRootDashboard && (
                <Box
                    sx={{
                        display: "flex",
                        gap: 1.5,
                        flexWrap: "wrap",
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4),
                        border: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <Button
                        component={Link}
                        to="/dashboard/account"
                        variant="contained"
                        size="small"
                        startIcon={<AccountBalanceOutlinedIcon />}
                    >
                        Manage Account
                    </Button>
                    <Button
                        component={Link}
                        to="/plans"
                        variant="outlined"
                        size="small"
                        startIcon={<TrendingUpOutlinedIcon />}
                    >
                        View Plans
                    </Button>
                    <Button
                        component={Link}
                        to="/dashboard/copy-trading"
                        variant="outlined"
                        size="small"
                        startIcon={<PeopleOutlinedIcon />}
                    >
                        Copy Trading
                    </Button>
                </Box>
            )}

            {/* Portfolio Overview Section */}
            <Grid container spacing={DASHBOARD_GRID_SPACING} columns={12}>
                {/* Empty State Guidance for New Users */}
                {hasZeroBalance && isKycApproved && (
                    <Grid size={{ xs: 12 }}>
                        <Box
                            sx={{
                                p: 3,
                                borderRadius: 2,
                                bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                                border: "1px solid",
                                borderColor: (theme) => alpha(theme.palette.info.main, 0.3),
                            }}
                        >
                            <Stack spacing={2} alignItems="center" textAlign="center">
                                <WalletOutlinedIcon sx={{ fontSize: 48, color: "info.main" }} />
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        Ready to start investing?
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Add funds to your wallet to begin copy trading or explore long-term investment plans.
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1.5}>
                                    <Button
                                        component={Link}
                                        to="/dashboard/account"
                                        variant="contained"
                                        startIcon={<AccountBalanceOutlinedIcon />}
                                    >
                                        Add Funds
                                    </Button>
                                    <Button
                                        component={Link}
                                        to="/plans"
                                        variant="outlined"
                                    >
                                        Explore Plans
                                    </Button>
                                </Stack>
                            </Stack>
                        </Box>
                    </Grid>
                )}
                {/* Main Portfolio Metrics - stacks on mobile, 2-up on small, 4-up on desktop */}
                {(isLoading ? [null, null, null, null] : portfolioTelemetry).map((stat, idx) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat ? stat.title : idx}>
                        {isLoading ? (
                            <StatCardSkeleton />
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.35, delay: idx * 0.04 }}
                            >
                                <MetricCard
                                title={(stat as typeof portfolioTelemetry[number]).title}
                                value={(stat as typeof portfolioTelemetry[number]).value}
                                icon={(stat as typeof portfolioTelemetry[number]).icon}
                                color={(stat as typeof portfolioTelemetry[number]).color}
                                secondaryText={(stat as typeof portfolioTelemetry[number]).secondaryText}
                            />
                            </motion.div>
                        )}
                    </Grid>
                ))}
            </Grid>


            {/* Hero ROI Chart + Market Tickers Section (Left-Dominant Layout) */}
            <Grid container spacing={DASHBOARD_GRID_SPACING} columns={12} sx={{ mt: 0 }}>
                {/* ROI Chart - Hero Element (8 columns on desktop) */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <ROIChart
                        data={roiChartData}
                        title="Cumulative Performance"
                        height={250}
                        isLoading={copyTradingHistoryFullQuery.isLoading}
                        valuePrefix="$"
                        valueSuffix=""
                        dataLabel="Performance"
                    />
                </Grid>

                {/* Market Price Tickers - Informational (4 columns on desktop) */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Box
                        sx={{
                            borderRadius: '14px',
                            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            background: (theme) => `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.primary.main, 0.06)})`,
                            boxShadow: (theme) => `0 24px 60px -40px ${alpha(theme.palette.primary.main, 0.65)}` ,
                            overflow: "hidden",
                            height: "100%",
                        }}
                    >
                        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, borderBottom: 1, borderColor: "divider" }}> {/* T2 medium density */}
                            <Typography variant="subtitle1" fontWeight={600}>
                                Market Prices
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Real-time cryptocurrency prices
                            </Typography>
                        </Box>
                        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, maxHeight: 250, overflowY: "auto" }}> {/* T2 medium density */}
                            {marketPricesQuery.isLoading ? (
                                <TableSkeleton rows={4} />
                            ) : marketPricesQuery.data && marketPricesQuery.data.length > 0 ? (
                                <Stack spacing={1.5}>
                                    {marketPricesQuery.data.map((price) => {
                                        const isPositive = price.change >= 0;
                                        return (
                                            <Box
                                                key={price.symbol}
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    pb: 1.5,
                                                    borderBottom: "1px solid",
                                                    borderColor: "divider",
                                                    "&:last-child": {
                                                        borderBottom: "none",
                                                        pb: 0,
                                                    },
                                                }}
                                            >
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {price.displayName}
                                                    </Typography>
                                                    <Typography 
                                                        variant="caption" 
                                                        sx={{ 
                                                            color: isPositive ? "success.main" : "error.main",
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {isPositive ? "+" : ""}{price.changePercent.toFixed(2)}%
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    ${price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                                    No market data available
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Grid>
            </Grid>

            {/* Trading Analytics Section */}
            <Grid container spacing={DASHBOARD_GRID_SPACING} columns={12} sx={{ mt: 0 }}>
                {/* Copy Trading History */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Panel
                        title="Trade history"
                        subtitle="Latest 5 executions and ROI events"
                        actions={
                            <Stack direction="row" spacing={1}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    component={Link}
                                    to="/dashboard/executions"
                                    sx={{ textTransform: "none" }}
                                >
                                    Export CSV
                                </Button>
                                <Button
                                    size="small"
                                    endIcon={<ArrowForwardIosRounded fontSize="inherit" />}
                                    component={Link}
                                    to="/dashboard/executions"
                                >
                                    View more
                                </Button>
                            </Stack>
                        }
                        sx={{ height: "100%" }}
                    >
                        <CopyTradingHistory pageSize={5} compact />
                    </Panel>
                </Grid>

                {/* Performance Analytics (Chart Only - No Trade Blotter) */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Panel
                        title="Performance Analytics"
                        subtitle="Daily performance breakdown"
                        actions={
                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 0.75,
                                    borderRadius: 1,
                                    bgcolor: (theme) => latestDailyProfit >= 0 
                                        ? alpha(theme.palette.success.main, 0.1) 
                                        : alpha(theme.palette.error.main, 0.1),
                                    color: latestDailyProfit >= 0 ? "success.main" : "error.main",
                                }}
                            >
                                <Typography variant="caption" fontWeight={600}>
                                    {formatCurrency(latestDailyProfit)}
                                </Typography>
                            </Box>
                        }
                        sx={{ height: "100%" }}
                    >
                            <Stack spacing={2}>
                                {/* Time-Range Filter Tabs */}
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typography variant="body2" fontWeight={500} color="text.secondary">
                                        Time Range
                                    </Typography>
                                    <ToggleButtonGroup
                                        value={timeRange}
                                        exclusive
                                        onChange={(_, newValue) => {
                                            if (newValue !== null) {
                                                setTimeRange(newValue);
                                            }
                                        }}
                                        size="small"
                                        sx={{
                                            "& .MuiToggleButton-root": {
                                                textTransform: "none",
                                                fontSize: "0.75rem",
                                                px: 1.5,
                                            },
                                        }}
                                    >
                                        <ToggleButton value="7d">7 days</ToggleButton>
                                        <ToggleButton value="30d">30 days</ToggleButton>
                                        <ToggleButton value="all">All</ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                                {renderDailyPerformance(filteredPerformance)}
                            </Stack>
                    </Panel>
                </Grid>
            </Grid>

            {/* Active Copy Trading Positions Section */}
            <Grid container spacing={DASHBOARD_GRID_SPACING} columns={12} sx={{ mt: 0 }}>
                <Grid size={{ xs: 12 }}>
                    <ActiveCopyPositionsImproved />
                </Grid>
            </Grid>
        </>
    );

      const USER_NAVIGATION: MaterialDashboardNavItem[] = [
          { label: "Dashboard", to: "/dashboard", icon: DashboardOutlinedIcon, exact: true },
          { label: "Long-Term Plans", to: "/plans", icon: TrendingUpOutlinedIcon },
          { label: "Copy Trading", to: "/dashboard/copy-trading", icon: PeopleOutlinedIcon },
          { label: "Executions", to: "/dashboard/executions", icon: HistoryOutlinedIcon },
          { label: "Account", to: "/dashboard/account", icon: AccountBalanceOutlinedIcon },
          { label: "Settings", to: "/dashboard/settings", icon: SettingsOutlinedIcon },
          { label: "Support", to: "/support", icon: HelpOutlineIcon },
      ];

    const content = isRootDashboard ? overviewContent : children ?? null;

    const userInfo = useMemo(() => (user
        ? {
            name: user.full_name ?? user.email ?? undefined,
            email: user.email ?? undefined,
            avatarUrl: toAbsoluteResource(user.profile_picture_url),
            role: isAdmin ? 'admin' : 'user',
        }
        : null), [user, isAdmin]);

    const layoutActions = !isRootDashboard
        ? null
        : (isLoading ? <Skeleton variant="rectangular" width={96} height={28} sx={{ borderRadius: 1.5 }} /> : undefined);

    return (
        <>
            <MaterialDashboardLayout
                title="Dashboard"
                subtitle="Monitor your investments and trading performance"
                navigation={USER_NAVIGATION}
                actions={layoutActions}
                user={userInfo}
                onLogout={logout}
            >
                {content}
            </MaterialDashboardLayout>
        </>
    );
};
