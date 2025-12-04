import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import {
    AppBar,
    Avatar,
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Toolbar,
    Typography,
    alpha,
} from "@mui/material";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Link, useLocation } from "@tanstack/react-router";
import { AppIcon } from "@/components/AppIcon";
import { ThemeToggle } from "@/components/base/buttons/theme-toggle";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { DASHBOARD_GRID_SPACING } from "@/constants/layout";
import { useDashboardStore } from "@/stores/dashboard-store";
import packageJson from "../../../../package.json";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

const drawerWidth = 272;

// Get version from package.json
const packageVersion = packageJson.version;

export interface MaterialDashboardNavItem {
    label: string;
    to: string;
    icon: ComponentType<SvgIconProps>;
    exact?: boolean;
    matcher?: (pathname: string) => boolean;
}

export interface MaterialDashboardLayoutProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
    navigation: MaterialDashboardNavItem[];
    actions?: ReactNode;
    sidebarSection?: ReactNode;
    quickSettings?: ReactNode;
    globalSearch?: ReactNode;
    user?: {
        name?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
        role?: string | null;
    } | null;
    onLogout?: () => void;
}

export const MaterialDashboardLayout = ({
    children,
    title,
    subtitle,
    navigation,
    actions,
    sidebarSection,
    quickSettings,
    globalSearch,
    user,
    onLogout,
}: MaterialDashboardLayoutProps) => {
    const muiTheme = useMuiTheme();
    const isMdUp = useMediaQuery(muiTheme.breakpoints.up("md"));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const { pathname } = useLocation();

    // Desktop sidebar state from Zustand store (persistent across reloads)
    const sidebarOpen = useDashboardStore((s) => s.sidebarOpen);
    const setSidebarOpen = useDashboardStore((s) => s.setSidebarOpen);

    const handleDrawerToggle = () => {
        setMobileOpen((prev) => !prev);
    };

    const handleDesktopSidebarToggle = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const selectedMatcher = (item: MaterialDashboardNavItem) => {
        if (item.matcher) {
            return item.matcher(pathname);
        }
        if (item.exact) {
            return pathname === item.to;
        }
        return pathname === item.to || pathname.startsWith(`${item.to}/`);
    };

    const drawerContent = (
        <Box
            role="navigation"
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "background.paper",
                pb: 2,
            }}
        >
            {/* Zone 1: Top - Logo and branding */}
            <Box
                sx={{
                    px: 3,
                    py: 2.5,
                    minHeight: 72,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Typography variant="h6" fontWeight={700} sx={{ color: "primary.main" }}>
                    Apex Trading
                </Typography>
                {isMdUp && (
                    <IconButton onClick={handleDesktopSidebarToggle} size="small" aria-label="toggle sidebar" sx={{ color: "text.secondary" }}>
                        <ChevronLeftRoundedIcon />
                    </IconButton>
                )}
            </Box>
            <Divider />

            {/* Zone 2: Middle - Navigation items */}
            <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                <List sx={{ px: 1.5, py: 0.75 }}>
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const selected = selectedMatcher(item);
                        return (
                            <ListItem key={item.label} disablePadding sx={{ mb: 0.25 }}>
                                <ListItemButton
                                    component={Link}
                                    to={item.to}
                                    selected={selected}
                                    onClick={() => setMobileOpen(false)}
                                    sx={{
                                        borderRadius: 2.5,
                                        height: 42,
                                        px: 2.25,
                                        alignItems: "center",
                                        transition: "all 0.22s ease",
                                        background: (theme) => selected
                                            ? `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.background.paper, 0.9)})`
                                            : "transparent",
                                        border: (theme) => selected
                                            ? `1px solid ${alpha(theme.palette.primary.main, 0.4)}`
                                            : `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                                        boxShadow: (theme) => selected ? `0 12px 32px -24px ${alpha(theme.palette.primary.main, 0.7)}` : "none",
                                        color: selected ? "accent.main" : undefined,
                                        "&:hover": {
                                            background: (theme) =>
                                                `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.background.paper, 0.96)})`,
                                            transform: "translateY(-1px)",
                                        },
                                        "&.Mui-selected": {
                                            fontWeight: 600,
                                        },
                                        "&:focus-visible": {
                                            outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                                            outlineOffset: 2,
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ color: "inherit", minWidth: 32 }}>
                                        <Icon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{
                                            fontWeight: selected ? 600 : 500,
                                            fontSize: "0.875rem",
                                            color: "inherit",
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>

                {/* Optional sidebar sections */}
                {sidebarSection && (
                    <>
                        <Divider sx={{ mx: 1.5, my: 2 }} />
                        <Box sx={{ px: 2, pb: 2 }}>{sidebarSection}</Box>
                    </>
                )}

                {quickSettings && (
                    <>
                        <Divider sx={{ mx: 1.5, my: 2 }} />
                        <Box sx={{ px: 2, pb: 2 }}>{quickSettings}</Box>
                    </>
                )}
            </Box>

            {/* Zone 3: Bottom - User profile (sticky) */}
            {user && (
                <>
                    <Divider />
                    <Box sx={{ px: 2, py: 1.25 }}>
                        <Stack direction="row" spacing={1.0} alignItems="center">
                            <Avatar src={user.avatarUrl ?? undefined} alt={user.name ?? user.email ?? "User"} sx={{ width: 32, height: 32 }}>
                                {user.name?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? "A"}
                            </Avatar>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography
                                    variant="subtitle2"
                                    fontWeight={600}
                                    noWrap
                                    fontSize="0.875rem"
                                    sx={{ overflow: "hidden", textOverflow: "ellipsis", display: "block" }}
                                >
                                    {user.name ?? "User"}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    noWrap
                                    fontSize="0.75rem"
                                    sx={{ overflow: "hidden", textOverflow: "ellipsis", display: "block" }}
                                >
                                    {user.email ?? ""}
                                </Typography>
                            </Box>
                            {onLogout && (
                                <IconButton
                                    size="small"
                                    onClick={onLogout}
                                    aria-label="logout"
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": {
                                            color: "error.main",
                                            bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "light" ? 0.08 : 0.16),
                                        },
                                    }}
                                >
                                    <LogoutRoundedIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Stack>
                    </Box>
                </>
            )}
        </Box>
    );

    const appBarWidth = useMemo(() => {
        if (!isMdUp) return "100%";
        return sidebarOpen ? `calc(100% - ${drawerWidth}px)` : "100%";
    }, [isMdUp, sidebarOpen]);

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }}>
            <AppBar
                position="fixed"
                elevation={0}
                color="inherit"
                sx={{
                    width: appBarWidth,
                    ml: isMdUp && sidebarOpen ? `${drawerWidth}px` : 0,
                    borderBottom: (theme) =>
                        `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.14)}`
                    ,                    background: (theme) => {
                        if (theme.palette.mode === "light") {
                            return `linear-gradient(120deg, ${alpha('#0ea5e9', 0.92)}, ${alpha('#0b7b96', 0.92)})`;
                        }
                        return `linear-gradient(120deg, ${alpha(theme.palette.background.paper, 0.92)}, ${alpha(theme.palette.primary.main, 0.08)})`;
                    },
                    color: (theme) => theme.palette.common.white,
                    '& .MuiSvgIcon-root': { color: '#ffffff' },
                    '& .MuiButtonBase-root': { color: '#ffffff' },
                    backdropFilter: (theme) => theme.palette.mode === "light" ? "blur(6px)" : "blur(12px)",
                    transition: muiTheme.transitions.create(["width", "margin"], {
                        easing: muiTheme.transitions.easing.sharp,
                        duration: muiTheme.transitions.duration.leavingScreen,
                    }),
                    boxShadow: (theme) => `0 20px 60px -40px ${alpha(theme.palette.primary.main, 0.6)}`,
                }}
            >
                <Toolbar sx={{ height: { xs: 48, sm: 56 }, minHeight: { xs: 48, sm: 56 }, px: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {isMdUp && !sidebarOpen && (
                            <IconButton color="inherit" edge="start" onClick={handleDesktopSidebarToggle} sx={{ mr: 0.5 }} aria-label="open sidebar">
                                <ChevronRightRoundedIcon />
                            </IconButton>
                        )}
                        {!isMdUp && (
                            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} aria-label="toggle navigation">
                                <MenuRoundedIcon />
                            </IconButton>
                        )}
                        <AppIcon sx={(theme) => ({ opacity: theme.palette.mode === "light" ? 1 : 0.9, color: theme.palette.text.primary })} />
                    </Box>

                    <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.25, md: 1.75 } }}>
                        <Box
                            sx={{
                                display: { xs: mobileSearchOpen ? "flex" : "none", md: "none" },
                                alignItems: "center",
                                width: "100%",
                            }}
                        >
                            {globalSearch}
                        </Box>
                        <Box
                            sx={{
                                display: { xs: "none", md: "flex" },
                                alignItems: "center",
                                maxWidth: 400,
                                width: "100%",
                            }}
                        >
                            {globalSearch}
                        </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.25, md: 1.75 } }}>
                        <IconButton
                            aria-label="open search"
                            color="inherit"
                            onClick={() => setMobileSearchOpen((v) => !v)}
                            sx={{ display: { xs: "inline-flex", md: "none" } }}
                        >
                            <SearchRoundedIcon />
                        </IconButton>
                        <ThemeToggle appearance="contrast" />
                        <NotificationCenter />
                        {user && (
                            <Avatar
                                src={user.avatarUrl ?? undefined}
                                alt={user.name ?? user.email ?? "User"}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    cursor: "pointer",
                                }}
                            >
                                {user.name?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? "A"}
                            </Avatar>
                        )}
                    </Box>
                </Toolbar>
            </AppBar>

            <Box
                component="nav"
                sx={{
                    width: { md: sidebarOpen ? drawerWidth : 0 },
                    flexShrink: { md: 0 },
                    transition: muiTheme.transitions.create("width", {
                        easing: muiTheme.transitions.easing.sharp,
                        duration: muiTheme.transitions.duration.leavingScreen,
                    }),
                }}
                aria-label="sidebar navigation"
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: "block", md: "none" },
                        "& .MuiDrawer-paper": {
                            boxSizing: "border-box",
                            width: drawerWidth,
                            background: (theme) =>
                                `linear-gradient(135deg, ${alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.98 : 0.92)}, ${alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.06 : 0.04)})`,
                            borderRight: (theme) => `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.14 : 0.2)}`,
                            backdropFilter: (theme) => theme.palette.mode === "light" ? "blur(8px)" : "blur(12px)",
                            boxShadow: (theme) => `0 20px 60px -45px ${alpha(theme.palette.primary.main, 0.5)}`
                        },
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", px: 1 }}>
                        <IconButton onClick={handleDrawerToggle} aria-label="close navigation">
                            <ChevronLeftRoundedIcon />
                        </IconButton>
                    </Box>
                    {drawerContent}
                </Drawer>
                {sidebarOpen && (
                    <Drawer
                        variant="permanent"
                        sx={{
                            display: { xs: "none", md: "block" },
                            "& .MuiDrawer-paper": {
                                boxSizing: "border-box",
                                width: drawerWidth,
                                borderRight: `1px solid ${alpha(muiTheme.palette.primary.main, muiTheme.palette.mode === "light" ? 0.14 : 0.2)}`,
                                background: (theme) =>
                                    `linear-gradient(135deg, ${alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.98 : 0.92)}, ${alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.06 : 0.04)})`,
                                backdropFilter: (theme) => theme.palette.mode === "light" ? "blur(8px)" : "blur(12px)",
                                boxShadow: (theme) => `0 20px 60px -45px ${alpha(theme.palette.primary.main, 0.5)}`
                            },
                        }}
                        open
                    >
                        {drawerContent}
                    </Drawer>
                )}
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: DASHBOARD_GRID_SPACING,
                    pt: { xs: 9, md: 10 },
                    width: "100%",
                    backgroundColor: "background.default",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "100vh",
                }}
            >
                <Box
                    sx={{
                        maxWidth: "1200px",
                        mx: "auto",
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: DASHBOARD_GRID_SPACING,
                        flexGrow: 1,
                    }}
                >
                    {/* Page Title Block */}
                    <Box sx={{ px: { xs: 0, sm: 0 }, py: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                            <Box>
                                <Typography
                                    sx={{
                                        fontSize: { xs: "1.05rem", sm: "1.3rem" },
                                        fontWeight: 600,
                                        letterSpacing: "-0.3px",
                                    }}
                                >
                                    {title}
                                </Typography>
                                {subtitle && (
                                    <Typography
                                        sx={{
                                            fontSize: { xs: "0.75rem", sm: "0.9rem" },
                                            color: "text.secondary",
                                            mt: 0.25,
                                        }}
                                    >
                                        {subtitle}
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                {actions !== null && (actions || (user?.role !== 'admin' && <DashboardActions />))}
                            </Box>
                        </Box>
                    </Box>

                    {children}
                </Box>

                {/* Minimal system footer */}
                <Box
                    sx={{
                        py: 1,
                        px: 2,
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        mt: 'auto',
                    }}
                >
                    Apex v{packageVersion} · Connected · © {new Date().getFullYear()}
                </Box>
            </Box>
        </Box>
    );
};
