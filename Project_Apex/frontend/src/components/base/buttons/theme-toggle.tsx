import { DarkMode, LightMode } from "@mui/icons-material";
import { IconButton, Tooltip, useMediaQuery, useTheme as useMuiTheme } from "@mui/material";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { useTheme } from "@/providers/theme-provider";

type ToggleColor = "secondary" | "tertiary";
type Appearance = "default" | "contrast";

export interface ThemeToggleProps {
    color?: ToggleColor;
    size?: "xs" | "sm";
    className?: string;
    /**
     * When set to "contrast", applies a high-contrast Material UI IconButton
     * that uses theme colors for proper visibility in both light and dark modes.
     */
    appearance?: Appearance;
}

export const ThemeToggle = ({ color = "tertiary", size = "sm", className, appearance = "default" }: ThemeToggleProps) => {
    const { theme, setTheme } = useTheme();
    const muiTheme = useMuiTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
    const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

    // Resolve effective theme to choose sun/moon glyph even when in "system"
    const resolvedTheme: "light" | "dark" = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

    const toggleTheme = () => {
        const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
    };

    const IconComponent = resolvedTheme === "dark" ? DarkMode : LightMode;
    const tooltipText = resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    const ariaLabel = resolvedTheme === "dark" ? "Dark theme active, switch to light theme" : "Light theme active, switch to dark theme";

    // Use Material UI IconButton for contrast mode for better theme integration
    if (appearance === "contrast") {
        return (
            <Tooltip title={tooltipText}>
                <IconButton
                    onClick={toggleTheme}
                    aria-label={ariaLabel}
                    className={className}
                    size={isMobile ? "large" : "medium"}
                    sx={{
                        color: 'text.primary',
                        bgcolor: 'action.hover',
                        border: "none",
                        boxShadow: (theme) => theme.palette.mode === "light" 
                            ? "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)"
                            : "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
                        transition: 'all 0.12s ease-in-out',
                        '&:hover': {
                            bgcolor: 'action.selected',
                            boxShadow: (theme) => theme.palette.mode === "light"
                                ? "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)"
                                : "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)",
                        },
                        minWidth: isMobile ? 44 : undefined,
                        minHeight: isMobile ? 44 : undefined,
                    }}
                >
                    <IconComponent fontSize={isMobile ? "medium" : "small"} />
                </IconButton>
            </Tooltip>
        );
    }

    // Default appearance uses ButtonUtility
    return (
        <ButtonUtility
            color={color}
            size={size}
            className={className}
            icon={IconComponent}
            tooltip={tooltipText}
            aria-label={ariaLabel}
            onClick={toggleTheme}
        />
    );
};
