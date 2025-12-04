import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";

import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { Box, Stack, Typography, Tabs, Tab } from '@mui/material';
import { CopyTradingService } from "@/api/services/CopyTradingService";
import { RoiCalculationsService } from "@/api/services/RoiCalculationsService";
import type { ExecutionEventType } from "@/api/models/ExecutionEventType";
import type { CopyTradingHistoryEvent } from "@/api/models/CopyTradingHistoryEvent";
import type { LongTermROIEvent } from "@/api/models/LongTermROIEvent";

type AllowedEventType = Exclude<ExecutionEventType, "MANUAL_ADJUSTMENT">;
type SimpleFilter = "ALL" | "PROFITS" | "LOSSES";

const typeLabels: Record<AllowedEventType, string> = {
  TRADER_SIMULATION: "Trader Executions",
  // In this context, follower profit events represent copy-trading ROI credits
  FOLLOWER_PROFIT: "Copy ROI",
  INVESTMENT_MATURED: "Investment Matured",
  SYSTEM_OPERATION: "System Operation",
};

const typeColors: Record<AllowedEventType, "primary" | "success"> = {
  TRADER_SIMULATION: "primary",
  FOLLOWER_PROFIT: "success",
  INVESTMENT_MATURED: "success",
  SYSTEM_OPERATION: "primary",
};

type TabType = "copy-trading" | "long-term";

const formatTimestamp = (value: string): string => new Date(value).toLocaleString();

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const computeImpact = (amount: number): string => {
  if (amount === 0) {
    return "—";
  }
  const percentage = (amount / 1000) * 100;
  const sign = percentage >= 0 ? "+" : "";
  return `${sign}${percentage.toFixed(2)}%`;
};

export const ExecutionFeedPage = () => {
  // Initialize tab state locally instead of from store to avoid hydration issues
  const [activeTab, setActiveTab] = useState<TabType>("copy-trading");
  
  const [filter, setFilter] = useState<SimpleFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Copy trading events query
  const { data: copyTradingData, isLoading: copyTradingLoading, error: copyTradingError, refetch: refetchCopyTrading } = useQuery({
    queryKey: ["copy-trading-history", currentPage, pageSize],
    queryFn: () => CopyTradingService.copyTradingGetCopyTradingHistory(currentPage, pageSize),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: activeTab === "copy-trading",
  });

  // Long-term ROI events query
  const { data: longTermData, isLoading: longTermLoading, error: longTermError, refetch: refetchLongTerm } = useQuery({
    queryKey: ["long-term-roi-history", currentPage, pageSize],
    queryFn: () => RoiCalculationsService.roiCalculationsGetLongTermRoiHistory(currentPage, pageSize),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: activeTab === "long-term",
  });

  const copyTradingEvents = (copyTradingData?.data || []).filter((e: CopyTradingHistoryEvent) => !(e.description && /long-term/i.test(e.description)));
  const longTermEvents = longTermData?.data || [];

  const filteredCopyTradingEvents = useMemo(() => {
    if (filter === "ALL") return copyTradingEvents;
    if (filter === "PROFITS") return copyTradingEvents.filter((e) => e.amount >= 0);
    return copyTradingEvents.filter((e) => e.amount < 0);
  }, [copyTradingEvents, filter]);

  const recentCopyTradingEvents = useMemo(() => filteredCopyTradingEvents.slice(0, 60), [filteredCopyTradingEvents]);
  const recentLongTermEvents = useMemo(() => longTermEvents.slice(0, 60), [longTermEvents]);

  const handleRefresh = async () => {
    if (activeTab === "copy-trading") {
      await refetchCopyTrading();
    } else {
      await refetchLongTerm();
    }
  };

  const isLoading = activeTab === "copy-trading" ? copyTradingLoading : longTermLoading;
  const error = activeTab === "copy-trading" ? copyTradingError : longTermError;
  const eventsCount = activeTab === "copy-trading" ? recentCopyTradingEvents.length : recentLongTermEvents.length;

  return (
    <Box sx={{ display: 'grid', rowGap: 3 }}>
      {/* Market strip above */}
      <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={600} color="text.primary">Executions</Typography>
          <Typography variant="body2" color="text.secondary">
            {activeTab === "copy-trading" 
              ? "Copy trading execution history. Data refreshes automatically every 30 seconds."
              : "Long-term ROI execution history. Data refreshes automatically every 30 seconds."}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: isLoading ? 'warning.main' : 'success.main',
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {isLoading ? 'Loading' : 'Connected'}
            </Typography>
            <Typography variant="caption" color="text.secondary">| {eventsCount} events</Typography>
          </Stack>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {error ? <Chip label="Failed to load" color="error" size="small" /> : null}
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              const events = activeTab === "copy-trading" ? recentCopyTradingEvents : recentLongTermEvents;
              const csvContent = [
                ['Date', 'Type', 'Amount', 'Trader', 'Description'].join(','),
                ...events.map((e: any) => [
                  new Date(e.created_at).toLocaleString(),
                  e.event_type || 'ROI',
                  e.amount || 0,
                  e.trader_code || e.trader_id || 'N/A',
                  (e.description || '').replace(/,/g, ';')
                ].join(','))
              ].join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `executions-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={isLoading || eventsCount === 0}
          >
            Export CSV
          </Button>
          <Button
            size="small"
            onClick={handleRefresh}
            variant="contained"
            disabled={isLoading}
            aria-busy={isLoading || undefined}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          aria-label="Execution feed tabs"
        >
          <Tab value="copy-trading" label="Copy Trading" />
          <Tab value="long-term" label="Long-Term ROI" />
        </Tabs>
      </Box>

      {/* Copy Trading Tab Content */}
      {activeTab === "copy-trading" && (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>
              Filter:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(["ALL", "PROFITS", "LOSSES"] as const).map((value) => {
                const label = value === "ALL" ? "All events" : value === "PROFITS" ? "Profits" : "Losses";
                const isActive = filter === value;
                return (
                  <Button
                    key={value}
                    size="small"
                    color={isActive ? "primary" : "secondary"}
                    variant={isActive ? "contained" : "outlined"}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </Button>
                );
              })}
            </Box>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Box
              sx={{
                minWidth: 760,
                borderRadius: 2,
                border: "none",
                boxShadow: (theme) => theme.shadows[1],
                bgcolor: 'background.paper',
                transition: "box-shadow 0.12s ease-in-out",
                '&:hover': {
                  boxShadow: (theme) => theme.shadows[4],
                },
                '@media (max-width: 599px)': {
                  minWidth: 'auto',
                  overflowX: 'visible',
                  '& > .header-grid': {
                    display: 'none',
                  },
                  '& .grid-row': {
                    display: 'flex',
                    flexDirection: 'column',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    mb: 2,
                    p: 2,
                  },
                  '& .grid-cell': {
                    display: 'block',
                    py: 1,
                    '&::before': {
                      content: 'attr(data-label)',
                      fontWeight: 600,
                      display: 'inline-block',
                      width: '120px',
                      color: 'text.secondary',
                    },
                  },
                },
              }}
            >
              <Box
                className="header-grid"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gap: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
                  px: 3,
                  py: 1.5,
                }}
              >
                <Typography variant="caption" sx={{ gridColumn: 'span 2', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>Timestamp</Typography>
                <Typography variant="caption" sx={{ gridColumn: 'span 3', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>Trader</Typography>
                <Typography variant="caption" sx={{ gridColumn: 'span 2', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>Type</Typography>
                <Typography variant="caption" sx={{ gridColumn: 'span 2', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>Symbol</Typography>
                <Typography variant="caption" sx={{ gridColumn: 'span 2', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right' }}>Amount</Typography>
                <Typography variant="caption" sx={{ gridColumn: 'span 1', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>Impact</Typography>
              </Box>
              <Box sx={{ '& > *:not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }}>
                {isLoading ? (
                  <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Loading copy trading events...
                    </Typography>
                  </Box>
                ) : recentCopyTradingEvents.length === 0 ? (
                  <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No copy trading events available yet.
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                      <Button size="small" variant="contained" onClick={() => (window.location.href = '/dashboard/account')}>
                        Transfer
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => (window.location.href = '/dashboard/copy-trading')}>
                        Start Copying
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  recentCopyTradingEvents.map((event: CopyTradingHistoryEvent) => {
                    const eventType = event.eventType as AllowedEventType;
                    const badgeColor = typeColors[eventType] ?? "brand";
                    const badgeLabel = typeLabels[eventType] ?? event.eventType.replace(/_/g, " ");

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Box
                          className="grid-row"
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(12, 1fr)',
                            alignItems: 'center',
                            gap: 2,
                            px: 3,
                            py: 1.5,
                          }}
                        >
                          <Typography
                            className="grid-cell"
                            data-label="Timestamp"
                            variant="body2"
                            sx={{ gridColumn: 'span 2', fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}
                          >
                            {formatTimestamp(event.createdAt)}
                          </Typography>
                          <Typography
                            className="grid-cell"
                            data-label="Trader"
                            variant="body2"
                            sx={{ gridColumn: 'span 3' }}
                          >
                            {event.traderDisplayName ?? event.traderCode ?? "Trader"}
                          </Typography>
                          <Box
                            className="grid-cell"
                            data-label="Type"
                            sx={{ gridColumn: 'span 2' }}
                          >
                            <Chip label={badgeLabel} color={badgeColor} size="small" />
                          </Box>
                          <Typography
                            className="grid-cell"
                            data-label="Symbol"
                            variant="body2"
                            sx={{ gridColumn: 'span 2', color: 'text.secondary' }}
                          >
                            {event.symbol ?? "—"}
                          </Typography>
                          <Typography
                            className="grid-cell"
                            data-label="Amount"
                            variant="body2"
                            sx={{
                              gridColumn: 'span 2',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: event.amount >= 0 ? 'success.main' : 'error.main',
                            }}
                          >
                            {formatCurrency(event.amount)}
                          </Typography>
                          <Typography
                            className="grid-cell"
                            data-label="Impact"
                            variant="caption"
                            sx={{ gridColumn: 'span 1', textAlign: 'right', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
                          >
                            {event.amount ? computeImpact(event.amount) : "—"}
                          </Typography>
                        </Box>
                      </motion.div>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>

          {copyTradingData && copyTradingData.total_pages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Page {currentPage} of {copyTradingData.total_pages} ({copyTradingData.count} total events)
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setCurrentPage((p) => Math.min(copyTradingData.total_pages, p + 1))}
                  disabled={currentPage >= copyTradingData.total_pages}
                >
                  Next
                </Button>
              </Stack>
            </Box>
          )}
        </>
      )}

      {/* Long-Term ROI Tab Content */}
      {activeTab === "long-term" && (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>
              Filter:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(["ALL", "PROFITS", "LOSSES"] as const).map((value) => {
                const label = value === "ALL" ? "All events" : value === "PROFITS" ? "Profits" : "Losses";
                const isActive = filter === value;
                return (
                  <Button
                    key={value}
                    size="small"
                    color={isActive ? "primary" : "secondary"}
                    variant={isActive ? "contained" : "outlined"}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </Button>
                );
              })}
            </Box>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Box
              sx={{
                minWidth: 760,
                borderRadius: 2,
                border: "none",
                boxShadow: (theme) => theme.shadows[1],
                bgcolor: 'background.paper',
                transition: "box-shadow 0.12s ease-in-out",
                '&:hover': {
                  boxShadow: (theme) => theme.shadows[4],
                },
                '@media (max-width: 599px)': {
                  minWidth: 'auto',
                  overflowX: 'visible',
                  '& > .header-grid': {
                    display: 'none',
                  },
                  '& .grid-row': {
                    display: 'flex',
                    flexDirection: 'column',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    mb: 2,
                    p: 2,
                  },
                  '& .grid-cell': {
                    display: 'block',
                    py: 1,
                    '&::before': {
                      content: 'attr(data-label)',
                      fontWeight: 600,
                      display: 'inline-block',
                      width: '120px',
                      color: 'text.secondary',
                    },
                  },
                },
              }}
            >
              <Box
                className="header-grid"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gap: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
                  px: 3,
                  py: 1.5,
                }}
              >
                <Typography variant="caption" sx={{ gridColumn: 'span 2', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>Timestamp</Typography>
                <Typography variant="caption" sx={{ gridColumn: 'span 4', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>Plan</Typography>
                <Typography variant="caption" sx={{ gridColumn: 'span 2', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>ROI %</Typography>
                <Typography variant="caption" sx={{ gridColumn: 'span 2', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right' }}>Amount</Typography>
                <Typography variant="caption" sx={{ gridColumn: 'span 2', fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>Impact</Typography>
              </Box>
              <Box sx={{ '& > *:not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }}>
                {isLoading ? (
                  <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Loading long-term ROI events...
                    </Typography>
                  </Box>
                ) : (filter === "PROFITS" ? recentLongTermEvents.filter((e) => e.amount >= 0) : filter === "LOSSES" ? recentLongTermEvents.filter((e) => e.amount < 0) : recentLongTermEvents).length === 0 ? (
                  <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No long-term ROI events available yet.
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                      <Button size="small" variant="contained" onClick={() => (window.location.href = '/dashboard/account')}>
                        Transfer
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => (window.location.href = '/plans')}>
                        View Plans
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  (filter === "PROFITS" ? recentLongTermEvents.filter((e) => e.amount >= 0) : filter === "LOSSES" ? recentLongTermEvents.filter((e) => e.amount < 0) : recentLongTermEvents).map((event: LongTermROIEvent) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Box
                        className="grid-row"
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(12, 1fr)',
                          alignItems: 'center',
                          gap: 2,
                          px: 3,
                          py: 1.5,
                        }}
                      >
                        <Typography
                          className="grid-cell"
                          data-label="Timestamp"
                          variant="body2"
                          sx={{ gridColumn: 'span 2', fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}
                        >
                          {formatTimestamp(event.createdAt)}
                        </Typography>
                        <Typography
                          className="grid-cell"
                          data-label="Plan"
                          variant="body2"
                          sx={{ gridColumn: 'span 4' }}
                        >
                          {event.planName}
                        </Typography>
                        <Box
                          className="grid-cell"
                          data-label="ROI %"
                          sx={{ gridColumn: 'span 2' }}
                        >
                          <Chip
                            label={`${event.roiPercent >= 0 ? "+" : ""}${event.roiPercent.toFixed(2)}%`}
                            color={event.roiPercent >= 0 ? "success" : "error"}
                            size="small"
                          />
                        </Box>
                        <Typography
                          className="grid-cell"
                          data-label="Amount"
                          variant="body2"
                          sx={{
                            gridColumn: 'span 2',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: event.amount >= 0 ? 'success.main' : 'error.main',
                          }}
                        >
                          {formatCurrency(event.amount)}
                        </Typography>
                        <Typography
                          className="grid-cell"
                          data-label="Impact"
                          variant="caption"
                          sx={{ gridColumn: 'span 2', textAlign: 'right', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
                        >
                          {event.amount ? computeImpact(event.amount) : "—"}
                        </Typography>
                      </Box>
                    </motion.div>
                  ))
                )}
              </Box>
            </Box>
          </Box>

          {longTermData && longTermData.totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Page {currentPage} of {longTermData.totalPages} ({longTermData.count} total events)
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setCurrentPage((p) => Math.min(longTermData.totalPages, p + 1))}
                  disabled={currentPage >= longTermData.totalPages}
                >
                  Next
                </Button>
              </Stack>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
