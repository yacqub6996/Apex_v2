import { type ReactNode } from "react";
import { useState } from "react";
import {
    Autorenew,
    BarChart as BarChart01,
    Public as Globe02,
    History,
    Settings as Settings01,
    VerifiedUser as ShieldTick,
    People as Users01,
    AccountBalanceWallet as Wallet01,
    FlashOn as Zap,
} from "@mui/icons-material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Link, useLocation } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/base/buttons/theme-toggle";
import { MoveFundsDrawer } from "@/components/dashboard/move-funds-drawer";
import { useAuth } from "@/providers/auth-provider";

const navigationItems = [
    { icon: BarChart01, label: "Portfolio Overview", to: "/dashboard" },
    { icon: Wallet01, label: "Apex Wallet", to: "/dashboard/wallet" },
    { icon: Users01, label: "Pro Trader Network", to: "/dashboard/copy-trading" },
    { icon: Globe02, label: "Market Analysis", to: "/dashboard/markets" },
    { icon: Zap, label: "Live Executions", to: "/dashboard/executions" },
    { icon: History, label: "Trade History", to: "/dashboard/history" },
    { icon: ShieldTick, label: "Risk Management", to: "/dashboard/risk" },
    { icon: Settings01, label: "Account Settings", to: "/settings" },
    { icon: ShieldTick, label: "KYC Verification", to: "/kyc" },
];

interface DashboardLayoutProps {
    children: ReactNode;
    isLoading?: boolean;
}

export const DashboardLayout = ({ children, isLoading = false }: DashboardLayoutProps) => {
    const { user, logout } = useAuth();
    const { pathname } = useLocation();
    const [moveFundsOpen, setMoveFundsOpen] = useState(false);

    const normalizedPathname = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

    return (
        <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
            {/* Floating theme toggle to guarantee visibility across dashboard pages */}
            <Box
                sx={{
                    position: "fixed",
                    right: { xs: 12, md: 16 },
                    bottom: { xs: 80, md: 96 }, // Moved up to avoid overlap with support chat widget
                    zIndex: (t) => t.zIndex.modal + 1,
                }}
            >
                <ThemeToggle appearance="contrast" />
            </Box>

            {/* Header Section */}
            <Box
                component="header"
                sx={{
                    borderBottom: 1,
                    boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
                    backgroundColor: "background.paper",
                    px: 3,
                    py: 3,
                }}
            >
                <Container maxWidth="xl">
                    <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                                <Chip
                                    label="Portfolio Console"
                                    color="primary"
                                    size="medium"
                                    sx={{
                                        backgroundColor: "rgba(0, 0, 0, 0.05)",
                                        color: "primary.main",
                                        fontWeight: 600,
                                        fontSize: "0.875rem",
                                    }}
                                />
                                <Chip
                                    label="Live Trading"
                                    color="primary"
                                    size="small"
                                    sx={{
                                        backgroundColor: "rgba(0, 0, 0, 0.05)",
                                        color: "primary.main",
                                        fontWeight: 600,
                                        fontSize: "0.75rem",
                                    }}
                                />
                            </Box>
                            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: "text.primary" }}>
                                Welcome back{user?.full_name ? `, ${user.full_name}` : ""}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                Live institutional trading dashboard
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: { xs: "flex-start", md: "flex-end" }, flexWrap: "wrap" }}>
                                <Chip
                                    label={`KYC: ${user?.kyc_status ?? "pending"}`}
                                    color={user?.kyc_status === "APPROVED" ? "success" : "warning"}
                                    size="small"
                                    icon={<ShieldTick sx={{ fontSize: 16 }} />}
                                />
                                <Chip label={`Tier: ${user?.account_tier ?? "Starter"}`} color="primary" size="small" />
                                <Button size="medium" onClick={() => setMoveFundsOpen(true)} variant="outlined">
                                    Move Funds
                                </Button>
                                <Button size="medium" onClick={logout} variant="contained">
                                    Sign out
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Main Content Section */}
            <Box component="main" sx={{ py: 4 }}>
                <Container maxWidth="xl">
                    {isLoading ? (
                        <Box sx={{ display: "flex", height: 384, alignItems: "center", justifyContent: "center" }}>
                            <Autorenew
                                sx={{
                                    fontSize: 32,
                                    color: "text.secondary",
                                    animation: "spin 1s linear infinite",
                                    "@keyframes spin": {
                                        "0%": { transform: "rotate(0deg)" },
                                        "100%": { transform: "rotate(360deg)" },
                                    },
                                }}
                            />
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, lg: 8 }}>
                                <Box sx={{ "& > *": { mb: 3 }, "& > *:last-child": { mb: 0 } }}>{children}</Box>
                            </Grid>
                            <Grid size={{ xs: 12, lg: 4 }}>
                                <Paper
                                    elevation={1}
                                    sx={{
                                        borderRadius: 2,
                                        border: "none",
                                        boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
                                        backgroundColor: "background.paper",
                                        p: 3,
                                    }}
                                >
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: "text.primary" }}>
                                            Apex Console
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                            Institutional Trading
                                        </Typography>
                                    </Box>
                                    <Box component="nav" sx={{ "& > *": { mb: 0.5 }, "& > *:last-child": { mb: 0 } }}>
                                        {navigationItems.map((item) => {
                                            const isActive =
                                                normalizedPathname === item.to || (item.to !== "/dashboard" && normalizedPathname.startsWith(`${item.to}/`));

                                            return (
                                                <Link key={item.label} to={item.to} className="no-underline">
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 1.5,
                                                            borderRadius: 1,
                                                            height: 40,
                                                            px: 2,
                                                            fontSize: "0.875rem",
                                                            transition: "all 0.16s ease-in-out",
                                                            ...(isActive
                                                                ? {
                                                                      borderLeft: (theme) => `3px solid ${theme.palette.accent.main}`,
                                                                      backgroundColor: "transparent",
                                                                      color: "accent.main",
                                                                      fontWeight: 600,
                                                                  }
                                                                : {
                                                                      borderLeft: "3px solid transparent",
                                                                      color: "text.secondary",
                                                                      "&:hover": {
                                                                          backgroundColor: (theme) =>
                                                                              theme.palette.mode === "dark"
                                                                                  ? theme.palette.action.hover
                                                                                  : theme.palette.action.selected,
                                                                          color: "accent.main",
                                                                      },
                                                                  }),
                                                        }}
                                                    >
                                                        <item.icon sx={{ fontSize: 16, color: "inherit" }} />
                                                        {item.label}
                                                    </Box>
                                                </Link>
                                            );
                                        })}
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    )}
                </Container>
            </Box>
            <MoveFundsDrawer open={moveFundsOpen} onClose={() => setMoveFundsOpen(false)} />
        </Box>
    );
};
