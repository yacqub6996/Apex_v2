import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Box,
    Button,
    Chip,
    Pagination,
    Stack,
    Typography,
    Alert,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Panel } from "@/components/shared/panel";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";

import { CopyTradingService } from "@/api/services/CopyTradingService";
import type { ExecutionEventType } from "@/api/models/ExecutionEventType";

type HistoryResponse = Awaited<ReturnType<typeof CopyTradingService.copyTradingGetCopyTradingHistory>>;
type HistoryEvent = HistoryResponse["data"][number];

const EVENT_LABELS: Record<Exclude<ExecutionEventType, "MANUAL_ADJUSTMENT">, string> = {
    TRADER_SIMULATION: "Trader Executions",
    // In dashboard context, follower profit events are copy-trading ROI credits
    FOLLOWER_PROFIT: "Copy ROI",
    INVESTMENT_MATURED: "Investment Matured",
    SYSTEM_OPERATION: "System Operation",
};

const EVENT_COLORS: Record<Exclude<ExecutionEventType, "MANUAL_ADJUSTMENT">, "primary" | "success"> = {
    TRADER_SIMULATION: "primary",
    FOLLOWER_PROFIT: "success",
    INVESTMENT_MATURED: "success",
    SYSTEM_OPERATION: "primary",
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

export interface TradeHistoryProps {
    pageSize?: number;
    compact?: boolean; // hides inner pagination/action
}

export const CopyTradingHistory = ({ pageSize: initialPageSize = 10, compact = false }: TradeHistoryProps = {}) => {
    const [page, setPage] = useState(1);
    const pageSize = initialPageSize;

    const query = useQuery({
        queryKey: ["copy-trading-history", page, pageSize],
    queryFn: () => CopyTradingService.copyTradingGetCopyTradingHistory(page, pageSize),
        refetchInterval: 30_000,
    });

    const events: HistoryEvent[] = query.data?.data ?? [];
    const totalPages = query.data?.total_pages ?? 1;

    const handleRefresh = () => {
        query.refetch();
    };

    const columns: DataTableColumn<HistoryEvent>[] = [
        {
            id: 'type',
            label: 'Type',
            accessor: (row) => row.eventType,
            render: (row) => {
                const typedEvent = row.eventType as Exclude<ExecutionEventType, "MANUAL_ADJUSTMENT">;
                const label = EVENT_LABELS[typedEvent] ?? row.eventType.replace(/_/g, " ");
                const chipColor = EVENT_COLORS[typedEvent] ?? "primary";
                
                return (
                    <Chip 
                        size="small" 
                        color={chipColor} 
                        label={label}
                        aria-label={`Event type: ${label}`}
                    />
                );
            },
            hideOnMobile: false,
        },
        {
            id: 'amount',
            label: 'Amount',
            accessor: (row) => row.amount,
            align: 'right',
            render: (row) => (
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        color={row.amount >= 0 ? "success.main" : "error.main"}
                    >
                        {formatCurrency(row.amount)}
                    </Typography>
                    {row.roiPercent && (
                        <Chip
                            size="small"
                            label={row.roiPercent}
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                </Stack>
            ),
            hideOnMobile: false,
        },
        {
            id: 'trader',
            label: 'Trader',
            accessor: (row) => row.traderDisplayName || 'N/A',
            render: (row) => (
                <Box>
                    {row.traderDisplayName && (
                        <Typography variant="body2" fontWeight={500} color="text.primary">
                            {row.traderDisplayName}
                        </Typography>
                    )}
                    {row.traderCode && (
                        <Typography variant="caption" color="text.secondary">
                            Code: {row.traderCode}
                        </Typography>
                    )}
                </Box>
            ),
            hideOnMobile: true,
        },
        {
            id: 'symbol',
            label: 'Symbol',
            accessor: (row) => row.symbol || 'N/A',
            align: 'center',
            render: (row) => (
                <Typography variant="body2" fontFamily="monospace">
                    {row.symbol || '—'}
                </Typography>
            ),
            hideOnMobile: true,
        },
        {
            id: 'description',
            label: 'Description',
            accessor: (row) => row.description,
            render: (row) => (
                <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 200, sm: 300, md: 400 } }}>
                    {row.description}
                </Typography>
            ),
            hideOnMobile: true,
        },
        {
            id: 'timestamp',
            label: 'Date',
            accessor: (row) => row.createdAt,
            align: 'right',
            render: (row) => (
                <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(row.createdAt)}
                </Typography>
            ),
            hideOnMobile: false,
        },
    ];

    if (query.isError) {
        return (
            <Panel 
                title={compact ? undefined : "Trade history"}
                subtitle={compact ? undefined : "Recent executions and ROI events"}
            >
                <Alert severity="error">
                    Unable to load copy trading history. Please try again.
                </Alert>
            </Panel>
        );
    }

    return (
        <Panel
            title={compact ? undefined : "Trade history"}
            subtitle={compact ? undefined : "Recent executions and ROI events"}
            actions={
                !compact && (
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={handleRefresh}
                        disabled={query.isFetching}
                        startIcon={<RefreshRoundedIcon />}
                        sx={{ minHeight: 44 }}
                    >
                        {query.isFetching ? "Refreshing" : "Refresh"}
                    </Button>
                )
            }
        >
            <Box sx={{ mt: { xs: 2, md: 0 } }}>
                <DataTable
                    columns={columns}
                    rows={events}
                    getRowKey={(row) => row.id}
                    emptyMessage="No trade activity yet. New execution and ROI events will appear here."
                    isLoading={query.isLoading}
                    skeletonRowCount={5}
                    dense={false}
                    mobileStack={true}
                />

                {!compact && totalPages > 1 && (
                    <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={(_, value) => setPage(value)}
                            size="small"
                            color="primary"
                        />
                    </Box>
                )}
            </Box>
        </Panel>
    );
};



