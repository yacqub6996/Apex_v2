import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { TradersService } from "@/api/services/TradersService";
import type { TraderProfilePublic } from "@/api/models/TraderProfilePublic";
import { CopyTradingService } from "@/api/services/CopyTradingService";
import type { CopyTradingAggregateResponse } from "@/api/models/CopyTradingAggregateResponse";
import type { RiskTolerance } from "@/api/models/RiskTolerance";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PeopleIcon from "@mui/icons-material/People";
import { toAbsoluteResource } from "@/utils/url";
import { TraderEditDrawer } from "@/components/admin/trader-edit-drawer";

const formatDateTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'N/A';

const formatRiskLevel = (risk: RiskTolerance | undefined) => {
  switch (risk) {
    case 'LOW':
      return { label: 'Low Risk', color: 'success' as const };
    case 'MEDIUM':
      return { label: 'Medium Risk', color: 'warning' as const };
    case 'HIGH':
      return { label: 'High Risk', color: 'error' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

const extractSpecialtyFromStrategy = (strategy?: string | null) => {
  if (!strategy) return 'General';
  
  // Strategy is in format "{specialty} trading specialist"
  const match = strategy.match(/^(\w+)\s+trading specialist$/);
  return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : 'General';
};

interface TradersListProps {
  className?: string;
}

export const TradersList = ({ className }: TradersListProps) => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingTraderId, setEditingTraderId] = React.useState<string | null>(null);
  const tradersQuery = useQuery({
    queryKey: ["admin-traders"],
    queryFn: () => TradersService.tradersReadTraders(0, 100),
  });

  const summaryQuery = useQuery<CopyTradingAggregateResponse>({
    queryKey: ["admin-copy-summary"],
    queryFn: () => CopyTradingService.copyTradingCopyTradingSummary(),
  });

  const traders = tradersQuery.data?.data ?? [];
  const summary = summaryQuery.data;

  // shared helper for any API-provided resource paths

  const handleRefresh = () => {
    tradersQuery.refetch();
  };

  const handleEditTrader = (traderId: string) => {
    setEditingTraderId(traderId);
    setDrawerOpen(true);
  };

  const handleDeleteTrader = (traderId: string) => {
    // TODO: Implement trader deletion functionality
    if (window.confirm('Are you sure you want to delete this trader?')) {
      console.log('Delete trader:', traderId);
    }
  };

  return (
    <Box
      className={className}
      sx={{
        borderRadius: 2,
        border: "none",
        boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
        bgcolor: "background.paper",
        p: 3,
      }}
    >
      {/* Local state for edit drawer */}
      {/* Using inline state hooks to avoid prop drilling */}
      
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600} color="text.primary">
            Active Traders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage trader profiles and their copy trading settings.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`${traders.length} traders`} color="primary" size="small" />
          <ButtonUtility icon={RefreshRoundedIcon} tooltip="Refresh" onClick={handleRefresh} />
        </Stack>
      </Box>

      {summaryQuery.isLoading ? (
        <Box
          sx={{
            mb: 2,
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          }}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={64} />
          ))}
        </Box>
      ) : summary ? (
        <Box
          sx={{
            mb: 2,
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          }}
        >
          <Box
            sx={{
              borderRadius: 1.5,
              border: "none",
              boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
              bgcolor: "background.default",
              p: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Active Copy Relationships
            </Typography>
            <Typography variant="h5" fontWeight={600} color="text.primary" sx={{ mt: 0.5 }}>
              {summary.active}
            </Typography>
          </Box>
          <Box
            sx={{
              borderRadius: 1.5,
              border: "none",
              boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
              bgcolor: "background.default",
              p: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Paused Copy Relationships
            </Typography>
            <Typography variant="h5" fontWeight={600} color="text.primary" sx={{ mt: 0.5 }}>
              {summary.paused}
            </Typography>
          </Box>
          <Box
            sx={{
              borderRadius: 1.5,
              border: "none",
              boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
              bgcolor: "background.default",
              p: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Stopped Copy Relationships
            </Typography>
            <Typography variant="h5" fontWeight={600} color="text.primary" sx={{ mt: 0.5 }}>
              {summary.stopped}
            </Typography>
          </Box>
        </Box>
      ) : null}

      {tradersQuery.isLoading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160 }}>
          <CircularProgress size={20} />
        </Box>
      ) : traders.length === 0 ? (
        <Stack alignItems="center" justifyContent="center" textAlign="center" spacing={0.5} sx={{ height: 160 }}>
          <PeopleIcon sx={{ fontSize: 48, color: "text.disabled", mb: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            No traders have been created yet.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Use the Trader Manager to create trader profiles.
          </Typography>
        </Stack>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Trader</TableCell>
                <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Specialty</TableCell>
                <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Risk Level</TableCell>
                <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Trader Code</TableCell>
                <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Copiers</TableCell>
                <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>AUC ($)</TableCell>
                <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Avg Return</TableCell>
                <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Status</TableCell>
                <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Created</TableCell>
                <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {traders.map((trader: TraderProfilePublic) => {
                const riskInfo = formatRiskLevel(trader.risk_tolerance);
                const specialty = extractSpecialtyFromStrategy(trader.trading_strategy);
                const traderCode = trader.trader_code;
                const displayName = trader.display_name;
                const avatarRaw = (trader as any).avatar_url as string | undefined;
                const initials = displayName
                  .split(" ")
                  .slice(0, 2)
                  .map((token) => token[0] ?? "")
                  .join("")
                  .toUpperCase() || specialty.slice(0, 2).toUpperCase();

                return (
                  <TableRow key={trader.id}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: "primary.main",
                            fontSize: "0.75rem",
                          }}
                          src={toAbsoluteResource(avatarRaw)}
                        >
                          {initials}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Trader Code: {traderCode}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={specialty} color="primary" size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={riskInfo.label} color={riskInfo.color} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", color: "text.primary" }}>{traderCode}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.primary">{(trader as any).total_copiers ?? 0}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.primary">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number((trader as any).total_assets_under_copy ?? 0))}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.primary">{(((trader as any).average_monthly_return ?? 0)).toFixed ? ((trader as any).average_monthly_return as number).toFixed(2) : Number((trader as any).average_monthly_return ?? 0).toFixed(2)}%</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={trader.is_public ? "Public" : "Private"} color={trader.is_public ? "success" : "default"} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(trader.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button size="small" variant="contained" onClick={() => handleEditTrader(trader.id)}>
                          Edit
                        </Button>
                        <Button size="small" variant="contained" color="error" onClick={() => handleDeleteTrader(trader.id)}>
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <TraderEditDrawer open={drawerOpen} traderId={editingTraderId} onClose={() => setDrawerOpen(false)} />
    </Box>
  );
};

