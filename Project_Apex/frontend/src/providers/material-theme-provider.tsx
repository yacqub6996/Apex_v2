import type { ReactNode } from "react";
import { useMemo } from "react";
import { alpha, CssBaseline, createTheme, responsiveFontSizes } from "@mui/material";
import { StyledEngineProvider, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import type { PaletteMode, ThemeOptions } from "@mui/material";
import { useTheme as useAppTheme } from "@/providers/theme-provider";

const buildThemeOptions = (mode: PaletteMode): ThemeOptions => ({
    // Mobile-first responsive breakpoints
    breakpoints: {
        values: {
            xs: 0,
            sm: 600,
            md: 900,
            lg: 1200,
            xl: 1536,
        },
    },
    palette: {
        mode,
        // Light Mode: Warm & Inviting with soft warm blue primary
        // Dark Mode: Sleek, Modern & Cozy with cool slate blue primary
        primary: {
            main: "#06B6D4",
            light: "#33C3E4",
            dark: "#0B7B96",
        },
        secondary: {
            main: "#0EA5E9",
            light: "#38BDF8",
            dark: "#0B79A6",
        },
        error: {
            main: "#EF4444",
            light: "#F87171",
            dark: "#B91C1C",
        },
        success: {
            main: "#10B981",
            light: "#34D399",
            dark: "#0F9F6E",
        },
        warning: {
            main: "#F59E0B",
            light: "#FBBF24",
            dark: "#B45309",
        },
        info: {
            main: "#06B6D4",
            light: "#33C3E4",
            dark: "#0B7B96",
        },
        // Accent color palette (brand identity) - aligned with primary colors
        accent: {
            main: "#06B6D4",
            soft: alpha("#06B6D4", 0.12),
            strong: alpha("#06B6D4", 0.22),
            contrastText: "#FFFFFF",
        },
        // Light Mode: Cream-based backgrounds for warmth
        // Dark Mode: Charcoal backgrounds for sleekness
        background: {
            default: mode === "light" ? "#f8fafc" : "#080808",
            paper: mode === "light" ? "#ffffff" : "#0F1115",
        },
        text: {
            primary: mode === "light" ? "#0f172a" : "#FFFFFF",
            secondary: mode === "light" ? "#475569" : "#E5E7EB",
        },
        divider: mode === "light" ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.08)",
        action: {
            active: mode === "light" ? "rgba(6, 182, 212, 0.7)" : "rgba(6, 182, 212, 0.7)",
            hover: mode === "light" ? "rgba(6, 182, 212, 0.1)" : "rgba(6, 182, 212, 0.08)",
            selected: mode === "light" ? "rgba(6, 182, 212, 0.16)" : "rgba(6, 182, 212, 0.14)",
            disabled: mode === "light" ? "rgba(15,23,42,0.38)" : "rgba(255,255,255,0.35)",
            disabledBackground: mode === "light" ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.08)",
            focus: "rgba(6, 182, 212, 0.18)",
        },
    },
    shape: {
        borderRadius: 12, // Updated to 12px for consistent geometry
    },
    // Subtle shadow tokens for surface hierarchy with depth
    shadows: [
        "none",
        mode === "light" ? "0 1px 3px rgba(15,23,42,0.08)" : "0 1px 3px rgba(0,0,0,0.3)",
        mode === "light" ? "0 2px 6px rgba(15,23,42,0.12)" : "0 2px 6px rgba(0,0,0,0.35)",
        mode === "light" ? "0 3px 10px rgba(15,23,42,0.14)" : "0 3px 10px rgba(0,0,0,0.4)",
        mode === "light" ? "0 4px 16px rgba(15,23,42,0.16)" : "0 4px 16px rgba(0,0,0,0.45)",
        ...Array(20).fill(mode === "light" ? "0 6px 20px rgba(15,23,42,0.2)" : "0 6px 20px rgba(0,0,0,0.5)")
    ] as any,  // Type assertion needed for custom shadow properties
    // Mobile-first responsive typography
    typography: {
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        h1: {
            fontWeight: 600,
            fontSize: "2rem", // 32px mobile
            lineHeight: 1.2,
            "@media (min-width:600px)": { fontSize: "2.5rem" }, // 40px tablet+
            "@media (min-width:900px)": { fontSize: "3rem" }, // 48px desktop
        },
        h2: {
            fontWeight: 600,
            fontSize: "1.75rem", // 28px mobile
            lineHeight: 1.3,
            "@media (min-width:600px)": { fontSize: "2rem" }, // 32px tablet+
            "@media (min-width:900px)": { fontSize: "2.25rem" }, // 36px desktop
        },
        h3: {
            fontWeight: 600,
            fontSize: "1.5rem", // 24px mobile
            lineHeight: 1.4,
            "@media (min-width:600px)": { fontSize: "1.75rem" }, // 28px tablet+
        },
        h4: {
            fontWeight: 600,
            fontSize: "1.25rem", // 20px mobile
            lineHeight: 1.4,
            "@media (min-width:600px)": { fontSize: "1.5rem" }, // 24px tablet+
        },
        body1: {
            fontSize: "1rem", // 16px mobile
            lineHeight: 1.6,
            "@media (min-width:600px)": { fontSize: "1.125rem" }, // 18px tablet+
        },
        body2: {
            fontSize: "0.875rem", // 14px mobile
            lineHeight: 1.5,
            "@media (min-width:600px)": { fontSize: "1rem" }, // 16px tablet+
        },
        button: {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.875rem", // 14px mobile
            "@media (min-width:600px)": { fontSize: "1rem" }, // 16px tablet+
        },
    },
    // Mobile-first responsive spacing
    spacing: 8, // 8px base unit for consistent spacing
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12, // Updated to 12px for consistent geometry
                    boxShadow: "none",
                    minHeight: "44px", // Touch-friendly minimum height
                    padding: "8px 16px", // Touch-friendly padding
                    transition: "all 0.1s ease-in-out",
                    "@media (min-width:600px)": {
                        minHeight: "40px",
                        padding: "6px 16px",
                    },
                    "&:hover": {
                        boxShadow: mode === "light" 
                            ? "0 3px 10px rgba(58, 115, 184, 0.15)" 
                            : "0 3px 10px rgba(58, 90, 134, 0.25)",
                    },
                },
            },
            defaultProps: {
                disableElevation: true,
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12, // consistent 12px geometry
                    boxShadow: mode === "light" 
                        ? "0 1px 3px rgba(51,51,51,0.05)"  // shadows[1] base
                        : "0 1px 3px rgba(0,0,0,0.3)",
                    transition: "box-shadow 0.12s ease-in-out",
                    border: "none",
                    "@media (min-width:600px)": {
                        borderRadius: 12,
                    },
                    "&:hover": {
                        boxShadow: mode === "light"
                            ? "0 2px 6px rgba(51,51,51,0.08)"  // shadows[2] hover
                            : "0 2px 6px rgba(0,0,0,0.35)",
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,  // consistent 12px geometry
                    backgroundImage: "none",
                    "@media (min-width:600px)": {
                        borderRadius: 12,
                    },
                },
                outlined: {
                    border: "none",
                    boxShadow: mode === "light"
                        ? "0 1px 3px rgba(51,51,51,0.05)"  // shadows[1] base
                        : "0 1px 3px rgba(0,0,0,0.3)",
                },
                elevation1: {
                    boxShadow: mode === "light"
                        ? "0 1px 3px rgba(51,51,51,0.05)"  // shadows[1] base
                        : "0 1px 3px rgba(0,0,0,0.3)",
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    "& .MuiOutlinedInput-root": {
                        borderRadius: 12, // consistent 12px geometry
                        minHeight: "48px", // Touch-friendly input height
                        "@media (min-width:600px)": {
                            minHeight: "44px",
                        },
                    },
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: "#0F1115",
                    color: "#E5E7EB",
                    boxShadow: "none",
                    borderBottom: mode === "light" 
                        ? "1px solid rgba(51,51,51,0.08)"
                        : "1px solid rgba(224,224,224,0.06)",
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    // Safe area insets for mobile devices
                    paddingLeft: "env(safe-area-inset-left)",
                    paddingRight: "env(safe-area-inset-right)",
                    paddingTop: "env(safe-area-inset-top)",
                    paddingBottom: "env(safe-area-inset-bottom)",
                },
            },
        },
    },
});

export const MaterialThemeProvider = ({ children }: { children: ReactNode }) => {
    const { theme } = useAppTheme();
    const paletteMode: PaletteMode = theme === "dark" ? "dark" : "light";

    const muiTheme = useMemo(() => responsiveFontSizes(createTheme(buildThemeOptions(paletteMode))), [paletteMode]);

    return (
        <StyledEngineProvider injectFirst>
            <MuiThemeProvider theme={muiTheme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </StyledEngineProvider>
    );
};
