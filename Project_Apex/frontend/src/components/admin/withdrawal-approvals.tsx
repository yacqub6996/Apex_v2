import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { AdminSimulationsService } from "@/api/services/AdminSimulationsService";
import type { PendingWithdrawal } from "@/api/models/PendingWithdrawal";

export const WithdrawalApprovals: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: pendingWithdrawals, isLoading } = useQuery({
    queryKey: ["admin-pending-withdrawals"],
    queryFn: () => AdminSimulationsService.adminSimulationsGetPendingWithdrawals(),
  });

  const approveMutation = useMutation({
    mutationFn: (transactionId: string) =>
      AdminSimulationsService.adminSimulationsApproveWithdrawal(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason: string }) =>
      AdminSimulationsService.adminSimulationsRejectWithdrawal(transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      value,
    );

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));

  const handleApprove = (withdrawal: PendingWithdrawal) => {
    if (
      window.confirm(
        `Approve withdrawal of ${formatCurrency(withdrawal.amount)} for ${withdrawal.email}?`,
      )
    ) {
      approveMutation.mutate(withdrawal.id);
    }
  };

  const handleReject = (withdrawal: PendingWithdrawal) => {
    const reason = window.prompt("Enter rejection reason:", "Insufficient funds");
    if (reason) {
      rejectMutation.mutate({
        transactionId: withdrawal.id,
        reason,
      });
    }
  };

  const withdrawals = pendingWithdrawals?.data || [];
  const renderSource = (source?: string) => {
    const s = (source || "").toUpperCase();
    if (s === "COPY_TRADING_WALLET") return "From: Copy Trading Wallet";
    if (s === "LONG_TERM_WALLET") return "From: Long-Term Wallet";
    if (s === "ACTIVE_ALLOCATION") return "From: Active Allocation";
    return source ? `From: ${source}` : "From: Unknown";
  };

  return (
    <>
      {isLoading ? (
        <Box
          sx={{
            minHeight: 128,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Stack spacing={1} alignItems="center">
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Loading withdrawals...
            </Typography>
          </Stack>
        </Box>
      ) : withdrawals.length === 0 ? (
        <Box sx={{ py: 1.5, textAlign: "center" }}>
          <Box sx={{ mb: 1.5, color: "text.secondary" }}>
            <svg
              width={48}
              height={48}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth={1}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Box>
          <Typography variant="body2" color="text.secondary">
            No pending withdrawal requests
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            All withdrawal requests have been processed.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1.5}
          >
            <Chip label={`${withdrawals.length} pending`} color="warning" size="small" />
            <Button
              size="small"
              variant="contained"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] })
              }
            >
              Refresh
            </Button>
          </Stack>

          <Stack spacing={1.5}>
            {withdrawals.map((withdrawal) => (
              <Box
                key={withdrawal.id}
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  px: 2,
                  py: 1.75,
                  bgcolor: "background.paper",
                  width: "100%",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "flex-start" }}
                  justifyContent="space-between"
                  spacing={2}
                  sx={{ width: "100%" }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "primary.main",
                        fontSize: "0.75rem",
                      }}
                    >
                      {withdrawal.email.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 0.5, minWidth: 0 }}
                      >
                        <Typography
                          variant="subtitle2"
                          color="primary"
                          noWrap
                          sx={{ minWidth: 0, maxWidth: "100%" }}
                        >
                          {withdrawal.email}
                        </Typography>
                        <Chip label="Pending" color="primary" size="small" />
                      </Stack>
                      {withdrawal.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 0.5 }}
                        >
                          {withdrawal.description}
                        </Typography>
                      )}
                      {withdrawal.plan_name && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Plan: {withdrawal.plan_name}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {renderSource(withdrawal.source)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Requested {formatDateTime(withdrawal.created_at)}
                      </Typography>
                    </Box>
                  </Stack>

                  <Box
                    sx={{
                      ml: { xs: 0, sm: 2 },
                      textAlign: { xs: "left", sm: "right" },
                      minWidth: { xs: "100%", sm: 180 },
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      color="primary"
                      sx={{ mb: 1 }}
                    >
                      {formatCurrency(withdrawal.amount)}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        flexWrap: "wrap",
                        justifyContent: { xs: "flex-start", sm: "flex-end" },
                      }}
                    >
                      <Button
                        size="small"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        variant="contained"
                        onClick={() => handleApprove(withdrawal)}
                        aria-busy={
                          approveMutation.isPending &&
                          approveMutation.variables === withdrawal.id
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        variant="outlined"
                        color="error"
                        onClick={() => handleReject(withdrawal)}
                        aria-busy={
                          rejectMutation.isPending &&
                          rejectMutation.variables?.transactionId === withdrawal.id
                        }
                      >
                        Reject
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Stack>
      )}

      {(approveMutation.isError || rejectMutation.isError) && (
        <Box
          sx={{
            mt: 2,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "error.light",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(211,47,47,0.15)"
                : "rgba(211,47,47,0.08)",
            p: 1.5,
          }}
        >
          <Typography variant="body2" color="error.main">
            {approveMutation.error instanceof Error
              ? approveMutation.error.message
              : rejectMutation.error instanceof Error
              ? rejectMutation.error.message
              : "An error occurred while processing the withdrawal request."}
          </Typography>
        </Box>
      )}

      {(approveMutation.isSuccess || rejectMutation.isSuccess) && (
        <Box
          sx={{
            mt: 2,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "success.light",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(56,142,60,0.15)"
                : "rgba(56,142,60,0.08)",
            p: 1.5,
          }}
        >
          <Typography variant="body2" color="success.main">
            Withdrawal request processed successfully.
          </Typography>
        </Box>
      )}
    </>
  );
};
