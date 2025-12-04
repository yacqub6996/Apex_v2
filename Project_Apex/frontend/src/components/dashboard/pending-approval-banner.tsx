import type { ReactNode } from "react";

import { Alert, AlertTitle, Box, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export type PendingApprovalItem = {
  id: string;
};

export type PendingApprovalBannerProps<T extends PendingApprovalItem> = {
  title: string;
  description?: string;
  icon: ReactNode;
  severity?: "info" | "warning" | "success" | "error";
  variant?: "default" | "compact";
  chipLabel?: string;
  summary?: ReactNode;
  items: T[];
  renderItem: (item: T, variant: "default" | "compact") => ReactNode;
};

export const PendingApprovalBanner = <T extends PendingApprovalItem>({
  title,
  description,
  icon,
  severity = "info",
  variant = "default",
  chipLabel,
  summary,
  items,
  renderItem,
}: PendingApprovalBannerProps<T>) => {
  if (!items.length) {
    return null;
  }

  const maxItems = variant === "compact" ? 2 : 3;

  return (
    <Alert
      icon={icon}
      severity={severity}
      sx={(theme) => {
        const palette = theme.palette[severity] ?? theme.palette.info;
        return {
          borderRadius: 2.5,
          border: `1px solid ${alpha(palette.main, 0.2)}`,
          background: `linear-gradient(135deg, ${alpha(palette.main, 0.08)}, ${alpha(
            theme.palette.background.paper,
            0.96,
          )})`,
          boxShadow: `0 18px 55px -35px ${alpha(palette.main, 0.9)}`,
        };
      }}
    >
      <Stack direction="column" spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <AlertTitle sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0 }}>
            {title}
            <Chip
              size="small"
              variant="filled"
              color={severity}
              label={
                chipLabel ?? (variant === "compact" ? `${items.length}` : `${items.length} in review`)
              }
            />
          </AlertTitle>
        </Stack>

        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}

        {summary && <Box>{summary}</Box>}

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} flexWrap="wrap">
          {items.slice(0, maxItems).map((item) => (
            <Box
              key={item.id}
              sx={(theme) => {
                const palette = theme.palette[severity] ?? theme.palette.info;
                return {
                  flex: 1,
                  minWidth: 0,
                  p: 1.25,
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(palette.main, 0.22)}`,
                  backgroundColor: alpha(palette.main, 0.06),
                };
              }}
            >
              {renderItem(item, variant)}
            </Box>
          ))}
        </Stack>
      </Stack>
    </Alert>
  );
};
