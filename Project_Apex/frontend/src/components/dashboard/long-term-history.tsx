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

import { TransactionsService } from "@/api/services/TransactionsService";

type TransactionsResponse = Awaited<ReturnType<typeof TransactionsService.transactionsReadTransactions>>;
type Transaction = TransactionsResponse["data"][number];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const formatROIPercent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

const getTransactionTypeColor = (type: string) => {
    switch (type) {
        case "LONG_TERM_ROI":
            return "success";
        case "ROI":
            return "primary";
        case "deposit":
            return "info";
        case "withdrawal":
            return "warning";
        case "adjustment":
            return "secondary";
        default:
            return "default";
    }
};

const getTransactionTypeLabel = (type: string) => {
    switch (type) {
        case "LONG_TERM_ROI":
            return "Long-Term ROI";
        case "ROI":
            return "Copy Trading ROI";
        case "deposit":
            return "Deposit";
        case "withdrawal":
            return "Withdrawal";
        case "adjustment":
            return "Adjustment";
        default:
            return type.replace(/_/g, " ");
    }
};

export const LongTermHistory = () => {
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const query = useQuery({
        queryKey: ["long-term-transactions", page, pageSize],
        queryFn: () => TransactionsService.transactionsReadTransactions(page - 1, pageSize),
        refetchInterval: 30000,
    });

    // Filter transactions to only show long-term ROI and ROI types
    const transactions: Transaction[] = (query.data?.data ?? [])
        .filter(transaction => 
            transaction.transaction_type === "LONG_TERM_ROI" || 
            transaction.transaction_type === "ROI"
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalPages = Math.ceil((query.data?.count ?? 0) / pageSize);

    const handleRefresh = () => {
        query.refetch();
    };

    const columns: DataTableColumn<Transaction>[] = [
        {
            id: 'type',
            label: 'Type',
            accessor: (row) => row.transaction_type,
            render: (row) => (
                <Chip
                    size="small"
                    color={getTransactionTypeColor(String(row.transaction_type))}
                    label={getTransactionTypeLabel(String(row.transaction_type))}
                    aria-label={`Transaction type: ${getTransactionTypeLabel(String(row.transaction_type))}`}
                />
            ),
            hideOnMobile: false,
        },
        {
            id: 'amount',
            label: 'Amount',
            accessor: (row) => row.amount,
            align: 'right',
            render: (row) => {
                const isPositive = row.amount >= 0;
                return (
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                        <Typography
                            variant="body2"
                            fontWeight={600}
                            color={isPositive ? "success.main" : "error.main"}
                        >
                            {formatCurrency(row.amount)}
                        </Typography>
                        {row.roi_percent && (
                            <Chip
                                size="small"
                                label={formatROIPercent(row.roi_percent)}
                                color={row.roi_percent >= 0 ? "success" : "error"}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                            />
                        )}
                    </Stack>
                );
            },
            hideOnMobile: false,
        },
        {
            id: 'description',
            label: 'Description',
            accessor: (row) => row.description,
            render: (row) => (
                <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 200, sm: 300, md: 400 } }}>
                    {row.description || '—'}
                </Typography>
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
            id: 'source',
            label: 'Source',
            accessor: (row) => row.source || 'N/A',
            align: 'center',
            render: (row) => (
                <Typography variant="caption" color="text.secondary">
                    {row.source ? row.source.replace(/_/g, " ") : '—'}
                </Typography>
            ),
            hideOnMobile: true,
        },
        {
            id: 'timestamp',
            label: 'Date',
            accessor: (row) => row.created_at,
            align: 'right',
            render: (row) => (
                <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(row.created_at)}
                </Typography>
            ),
            hideOnMobile: false,
        },
    ];

    if (query.isError) {
        return (
            <Panel 
                title="Long-Term Investment History"
                subtitle="ROI events and investment performance"
            >
                <Alert severity="error">
                    Unable to load investment history. Please try again.
                </Alert>
            </Panel>
        );
    }

    return (
        <Panel
            title="Long-Term Investment History"
            subtitle="ROI events and investment performance"
            actions={
                <Button
                    size="small"
                    variant="outlined"
                    onClick={handleRefresh}
                    disabled={query.isFetching}
                    endIcon={<RefreshRoundedIcon fontSize="small" />}
                    sx={{ minHeight: 44 }}
                >
                    {query.isFetching ? "Refreshing" : "Refresh"}
                </Button>
            }
        >
            <Box sx={{ mt: { xs: 2, md: 0 } }}>
                <DataTable
                    columns={columns}
                    rows={transactions}
                    getRowKey={(row) => row.id}
                    emptyMessage="No long-term investment activity yet. Long-term ROI events will appear here when allocated."
                    isLoading={query.isLoading}
                    skeletonRowCount={5}
                    dense={false}
                    mobileStack={true}
                />

                {totalPages > 1 && (
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

