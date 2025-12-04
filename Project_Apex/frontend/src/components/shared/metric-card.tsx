import { type ReactNode, memo } from "react";
import { Box, Card, CardContent, Stack, Typography, alpha, type SvgIconProps } from "@mui/material";
import type { ComponentType } from "react";

export interface MetricCardProps {
  /**
   * The main title/label for the metric
   */
  title: string;

  /**
   * The primary value to display (can be number or formatted string)
   */
  value: string | number;

  /**
   * Optional icon component to display
   */
  icon?: ComponentType<SvgIconProps>;

  /**
   * Optional secondary text (e.g., "+5% since yesterday")
   */
  secondaryText?: string;

  /**
   * Color theme for the icon background
   */
  color?: "primary" | "secondary" | "success" | "info" | "warning" | "error";

  /**
   * Optional additional content
   */
  children?: ReactNode;

  /**
   * Optional click handler (makes card clickable)
   */
  onClick?: () => void;

  /**
   * Optional link href (makes card a link)
   */
  href?: string;

  /**
   * Reduces padding for compact mobile layouts
   * @deprecated Use global compact layout setting from preferences
   */
  compact?: boolean;
}

/**
 * MetricCard - A reusable card component for displaying key performance indicators
 * 
 * This component provides a consistent way to display metrics across the dashboard.
 * It follows Material UI design patterns and uses theme values for consistent styling.
 * 
 * Example usage:
 * ```tsx
 * <MetricCard 
 *   title="Total Users" 
 *   value={1200} 
 *   icon={PeopleIcon}
 *   color="primary"
 *   secondaryText="+12% this month"
 *   onClick={() => navigate('/users')}
 * />
 * ```
 */
export const MetricCard = memo(({
  title,
  value,
  icon: Icon,
  secondaryText,
  color = "primary",
  children,
  onClick,
  href,
}: MetricCardProps) => {
  const isInteractive = Boolean(onClick || href);

  return (
    <Card
      variant="outlined"
      component={href ? "a" : "div"}
      href={href}
      onClick={onClick}
      sx={{
        borderRadius: 3,
        height: "100%",
        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        background: (theme) => `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.primary.main, 0.06)})`,
        boxShadow: (theme) => `0 20px 50px -35px ${alpha(theme.palette.primary.main, 0.65)}` ,
        transition: "all 0.18s ease",
        textDecoration: "none",
        cursor: isInteractive ? "pointer" : "default",
        "&:hover": {
          boxShadow: (theme) => `0 24px 60px -40px ${alpha(theme.palette.primary.main, 0.75)}` ,
          transform: isInteractive ? "translateY(-2px)" : "none",
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.32),
        },
      }}
    >
      <CardContent sx={{ p: { xs: 1.75, sm: 2.75 } }}> {/* T2 medium density */}
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1.25}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 0.5, lineHeight: 1.35, opacity: 0.7, whiteSpace: "normal" }}
            >
              {title}
            </Typography>
            <Typography
              variant="h6"
              fontWeight={600}
              sx={{ mb: secondaryText || children ? 0.5 : 0, lineHeight: 1.15 }}
              noWrap
            >
              {value}
            </Typography>
            {secondaryText && (
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ lineHeight: 1.4, opacity: 0.65 }}
              >
                {secondaryText}
              </Typography>
            )}
            {children}
          </Box>

          {Icon && (
            <Box
              sx={{
                width: 44, height: 44,
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: `${color}.main`,
                color: `${color}.contrastText`,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Icon fontSize="medium" />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
});

MetricCard.displayName = "MetricCard";

