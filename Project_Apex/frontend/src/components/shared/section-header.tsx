import { type ReactNode, memo } from "react";
import {
  Box,
  Stack,
  Typography,
  type SxProps,
  type Theme,
  type SvgIconProps,
} from "@mui/material";
import type { ComponentType } from "react";

export interface SectionHeaderProps {
  /**
   * The header text
   */
  children: ReactNode;

  /**
   * Typography variant to use
   */
  variant?: "h4" | "h5" | "h6" | "subtitle1" | "subtitle2";

  /**
   * Optional icon to display before the text
   */
  icon?: ComponentType<SvgIconProps>;

  /**
   * Optional action buttons/elements
   */
  actions?: ReactNode;

  /**
   * Optional subtitle or description
   */
  subtitle?: string;

  /**
   * Bottom margin (theme spacing multiplier)
   */
  marginBottom?: number;

  /**
   * Additional sx props
   */
  sx?: SxProps<Theme>;

  /**
   * Center align the header content on narrow screens
   */
  centered?: boolean;
}

/**
 * SectionHeader - A reusable section header component
 * 
 * This component provides consistent styling for section headers throughout
 * the application. It supports icons, actions, and subtitles.
 * 
 * Example usage:
 * ```tsx
 * <SectionHeader
 *   variant="h6"
 *   icon={DashboardIcon}
 *   actions={<Button>View All</Button>}
 *   subtitle="Overview of your dashboard"
 *   centered
 * >
 *   Dashboard Overview
 * </SectionHeader>
 * ```
 */
export const SectionHeader = memo(({
  children,
  variant = "h6",
  icon: Icon,
  actions,
  subtitle,
  marginBottom = 3,
  sx,
  centered = false,
}: SectionHeaderProps) => {
  return (
    <Box sx={{ mb: marginBottom, ...sx }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={centered ? { xs: "center", sm: "space-between" } : "space-between"}
        spacing={2}
        sx={{ 
          mb: subtitle ? 1 : 0,
          flexWrap: centered ? { xs: "wrap", sm: "nowrap" } : "nowrap",
        }}
      >
        <Stack 
          direction="row" 
          alignItems="center" 
          spacing={1.5}
          sx={{
            ...(centered && {
              width: { xs: "100%", sm: "auto" },
              justifyContent: { xs: "center", sm: "flex-start" },
            }),
          }}
        >
          {Icon && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                color: "primary.main",
              }}
              aria-hidden="true"
            >
              <Icon fontSize="small" />
            </Box>
          )}
          <Typography
            variant={variant}
            component={variant === "subtitle1" || variant === "subtitle2" ? "h3" : variant}
            sx={{ 
              fontWeight: 600,
              lineHeight: 1.3,
              ...(centered && {
                textAlign: { xs: "center", sm: "left" },
              }),
            }}
          >
            {children}
          </Typography>
        </Stack>

        {actions && (
          <Box 
            sx={{ 
              flexShrink: 0,
              ...(centered && {
                width: { xs: "100%", sm: "auto" },
                display: "flex",
                justifyContent: { xs: "center", sm: "flex-end" },
              }),
            }}
          >
            {actions}
          </Box>
        )}
      </Stack>

      {subtitle && (
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            lineHeight: 1.5,
            opacity: 0.65,
            ...(centered && {
              textAlign: { xs: "center", sm: "left" },
            }),
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
});

SectionHeader.displayName = "SectionHeader";
