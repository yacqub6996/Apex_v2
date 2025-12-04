import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
    Box,
    Button,
    Chip,
    Grid,
    Stack,
    Typography,
    Alert,
    LinearProgress,
    Tooltip,
} from "@mui/material";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import LockClockOutlinedIcon from "@mui/icons-material/LockClockOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import { LongTermService } from "@/api/services/LongTermService";
import { RoiCalculationsService } from "@/api/services/RoiCalculationsService";
import { Panel } from "@/components/shared/panel";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionHeader } from "@/components/shared/section-header";
import type { LongTermInvestmentItem } from "@/api/models/LongTermInvestmentItem";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
};

const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const LongTermStatus = () => {
    const navigate = useNavigate();

    // Fetch user's current investments
    const investmentsQuery = useQuery({
        queryKey: ["long-term-investments"],
        queryFn: async () => (await LongTermService.longTermListLongTermInvestments()).data,
    });

    // Fetch long-term ROI history for performance data
    const roiHistoryQuery = useQuery({
        queryKey: ["long-term-roi-history"],
        queryFn: () => RoiCalculationsService.roiCalculationsGetLongTermRoiHistory(1, 100),
    });

    const investments = investmentsQuery.data ?? [];
    const roiEvents = roiHistoryQuery.data?.data ?? [];

    const activePlans = useMemo(
        () => investments.filter((inv) => inv.status === "ACTIVE"),
        [investments]
    );

    const stats = useMemo(() => {
        if (activePlans.length === 0) {
            return {
                totalAllocated: 0,
                totalROI: 0,
                roiPercentage: 0,
                nextUnlockDate: null,
                daysUntilUnlock: null,
                unlockProgress: 0,
            };
        }

        const totalAllocated = activePlans.reduce((sum, inv) => sum + inv.allocation, 0);

        // Calculate ROI from events
        const totalROI = roiEvents.reduce((sum, event) => {
            const matchingPlan = activePlans.some((inv) => inv.plan_name === event.planName);
            return matchingPlan ? sum + event.amount : sum;
        }, 0);

        const roiPercentage = totalAllocated > 0 ? (totalROI / totalAllocated) * 100 : 0;

        // Find the next unlock date
        const now = new Date();
        const upcomingUnlocks = activePlans
            .map((inv) => {
                const unlockDate = inv.investment_due_date ? new Date(inv.investment_due_date) : null;
                return unlockDate ? { date: unlockDate, investment: inv } : null;
            })
            .filter((item): item is { date: Date; investment: LongTermInvestmentItem } => item !== null && item.date > now)
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        const nextUnlock = upcomingUnlocks[0];
        const nextUnlockDate = nextUnlock?.date || null;
        const daysUntilUnlock = nextUnlockDate 
            ? Math.ceil((nextUnlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        // Calculate unlock progress for the nearest investment
        let unlockProgress = 0;
        if (nextUnlock) {
            const inv = nextUnlock.investment;
            const startDate = new Date(inv.started_at);
            const endDate = inv.investment_due_date ? new Date(inv.investment_due_date) : null;
            if (endDate) {
                const totalDuration = endDate.getTime() - startDate.getTime();
                const elapsed = now.getTime() - startDate.getTime();
                unlockProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
            }
        }

        return {
            totalAllocated,
            totalROI,
            roiPercentage,
            nextUnlockDate,
            daysUntilUnlock,
            unlockProgress,
        };
    }, [activePlans, roiEvents]);

    const isLoading = investmentsQuery.isLoading || roiHistoryQuery.isLoading;

    const getTierColor = (tier: string): "primary" | "success" | "warning" | "info" => {
        switch (tier.toUpperCase()) {
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

    if (isLoading) {
        return (
            <Panel 
                title={
                    <SectionHeader variant="h6" icon={TrendingUpOutlinedIcon}>
                        Long-Term Investments
                    </SectionHeader>
                }
                loading
            >
                <Box sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary" align="center">
                        Loading investment data...
                    </Typography>
                </Box>
            </Panel>
        );
    }

    if (activePlans.length === 0) {
        return (
            <Panel 
                title={
                    <SectionHeader variant="h6" icon={TrendingUpOutlinedIcon}>
                        Long-Term Investments
                    </SectionHeader>
                }
            >
                <Alert severity="info" icon={<AddOutlinedIcon />} sx={{ mb: 2 }}>
                    No active investments yet. Start building your long-term wealth today.
                </Alert>
                <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate({ to: "/plans" })}
                    endIcon={<ArrowForwardOutlinedIcon />}
                    sx={{ minHeight: 44 }}
                >
                    View Plans
                </Button>
            </Panel>
        );
    }

    return (
        <Panel 
            title={
                <SectionHeader variant="h6" icon={TrendingUpOutlinedIcon}>
                    Long-Term Investments
                </SectionHeader>
            }
        >
            <Stack spacing={3}>
                {/* Summary Metrics */}
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <MetricCard
                            title="Total Locked"
                            value={formatCurrency(stats.totalAllocated)}
                            icon={AccountBalanceWalletOutlinedIcon}
                            color="primary"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <MetricCard
                            title="Next Unlock"
                            value={
                                stats.nextUnlockDate
                                    ? formatDate(stats.nextUnlockDate)
                                    : "N/A"
                            }
                            icon={LockClockOutlinedIcon}
                            color="info"
                            secondaryText={
                                stats.daysUntilUnlock !== null
                                    ? `In ${stats.daysUntilUnlock} ${stats.daysUntilUnlock === 1 ? 'day' : 'days'}`
                                    : undefined
                            }
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <MetricCard
                            title="Current APY"
                            value={formatPercentage(stats.roiPercentage)}
                            icon={TrendingUpIcon}
                            color={stats.roiPercentage >= 0 ? "success" : "error"}
                            secondaryText={formatCurrency(stats.totalROI)}
                        />
                    </Grid>
                </Grid>

                {/* Lock Period Progress */}
                {stats.nextUnlockDate && (
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Current Lock Period
                            </Typography>
                            <Tooltip title={`${stats.unlockProgress.toFixed(0)}% complete`}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    {stats.daysUntilUnlock} days remaining
                                </Typography>
                            </Tooltip>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={stats.unlockProgress}
                            sx={{ height: 8, borderRadius: 1 }}
                            color={stats.daysUntilUnlock && stats.daysUntilUnlock <= 7 ? "warning" : "success"}
                            aria-label={`Lock period ${stats.unlockProgress.toFixed(0)}% complete`}
                        />
                    </Box>
                )}

                {/* Active Plans List */}
                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom sx={{ fontWeight: 600 }}>
                        Active Plans ({activePlans.length})
                    </Typography>
                    <Stack spacing={1}>
                        {activePlans.map((investment) => {
                            // Find most recent ROI event for this plan
                            const latestEvent = roiEvents.find((e) => e.planName === investment.plan_name);
                            const planROI = latestEvent ? (latestEvent.amount / investment.allocation) * 100 : 0;

                            return (
                                <Box
                                    key={investment.id}
                                    sx={{
                                        p: 2,
                                        bgcolor: "background.default",
                                        borderRadius: 2,
                                        border: "none",
                                        boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            mb: 1,
                                        }}
                                    >
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" fontWeight={600} noWrap>
                                                {investment.plan_name}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={investment.plan_tier}
                                            size="small"
                                            color={getTierColor(investment.plan_tier)}
                                            variant="outlined"
                                        />
                                    </Box>

                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                                gutterBottom
                                            >
                                                Allocation
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600}>
                                                {formatCurrency(investment.allocation)}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                                gutterBottom
                                            >
                                                ROI
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                fontWeight={600}
                                                color={planROI >= 0 ? "success.main" : "error.main"}
                                            >
                                                {formatPercentage(planROI)}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            );
                        })}
                    </Stack>
                </Box>

                {/* Action Buttons */}
                <Stack spacing={1} direction="row" sx={{ mt: { xs: 3, md: 2 } }}>
                    <Button
                        variant="outlined"
                        size="medium"
                        onClick={() => navigate({ to: "/plans" })}
                        endIcon={<ArrowForwardOutlinedIcon fontSize="small" />}
                        fullWidth
                        sx={{ minHeight: 44 }}
                    >
                        View Plans
                    </Button>
                    <Button
                        variant="contained"
                        size="medium"
                        onClick={() => navigate({ to: "/plans" })}
                        fullWidth
                        sx={{ minHeight: 44 }}
                    >
                        Add More
                    </Button>
                </Stack>
            </Stack>
        </Panel>
    );
};

