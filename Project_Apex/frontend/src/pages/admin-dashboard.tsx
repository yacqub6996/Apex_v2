import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  Radio,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { AdminDashboardLayout } from "@/components/admin/admin-dashboard-layout";
import { WithdrawalApprovals } from "@/components/admin/withdrawal-approvals";
import { Panel } from "@/components/shared";
import { PendingDepositsBanner } from "@/components/dashboard/pending-deposits-banner";
import { AdminService } from "@/api/services/AdminService";
import { AdminExecutionsService } from "@/api/services/AdminExecutionsService";
import { UsersService } from "@/api/services/UsersService";
import type { AdminDepositItem } from "@/api/models/AdminDepositItem";
import type { AdminKycItem } from "@/api/models/AdminKycItem";
import type { ROIExecutionPushRequest } from "@/api/models/ROIExecutionPushRequest";
import type { UserPublic } from "@/api/models/UserPublic";
import { KycStatus } from "@/api/models/KycStatus";
import { DASHBOARD_GRID_SPACING } from "@/constants/layout";
import { toast } from "react-toastify";

const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const formatDateTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "N/A";

export const Dashboard = () => {
  const queryClient = useQueryClient();
  const isDesktop = useMediaQuery("(min-width:900px)");

  const [selectedTraderId, setSelectedTraderId] = useState<string>("");
  const [selectedFollowerId, setSelectedFollowerId] = useState<string>("");
  const [roiPercent, setRoiPercent] = useState<string>("");
  const [roiSymbol, setRoiSymbol] = useState<string>("");
  const [roiNote, setRoiNote] = useState<string>("");

  const [approvalsOpen, setApprovalsOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(true);
  const [searchInput, setSearchInput] = useState("");

  const [depositPage, setDepositPage] = useState(0);
  const [depositRowsPerPage, setDepositRowsPerPage] = useState(10);
  const [depositFilter, setDepositFilter] = useState<"all" | "confirmed" | "unconfirmed">("all");
  const [depositToApprove, setDepositToApprove] = useState<AdminDepositItem | null>(null);
  const [depositToReject, setDepositToReject] = useState<AdminDepositItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  const approvalsRef = useRef<HTMLDivElement | null>(null);
  const operationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Keep Approvals panel expanded by default on all viewports so deposits queue is immediately discoverable
    setApprovalsOpen(true);
    if (isDesktop) {
      setOperationsOpen(true);
      setPeopleOpen(true);
    } else {
      setOperationsOpen(false);
      setPeopleOpen(false);
    }
  }, [isDesktop]);

  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => AdminService.adminGetAdminDashboardSummary(),
    refetchInterval: 15000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => UsersService.usersReadUsers(0, 12),
  });

  const tradersQuery = useQuery({
    queryKey: ["admin-traders-for-executions"],
    queryFn: () => AdminExecutionsService.adminExecutionsGetTradersForExecutions(),
  });

  const followersQuery = useQuery({
    queryKey: ["admin-trader-followers", selectedTraderId],
    queryFn: () => AdminExecutionsService.adminExecutionsGetTraderFollowers(selectedTraderId),
    enabled: Boolean(selectedTraderId),
  });

  const followers = useMemo(
    () =>
      (followersQuery.data ?? []).map((f: Record<string, unknown>) => ({
        id: (f.id ?? f.user_id) as string,
        name: (f.full_name ?? f.email ?? "Follower") as string,
        email: f.email as string,
        balance: (f.copy_trading_balance ?? f.copy_amount ?? 0) as number,
        allocation: (f.copy_amount ?? 0) as number,
        startedAt: f.copy_started_at as string | undefined,
      })),
    [followersQuery.data],
  );


  const traderOptions = useMemo(
    () =>
      (tradersQuery.data ?? [])
        .map((t: Record<string, unknown>) => ({
          id: (t.id ?? t.trader_id ?? t.trader_code) as string,
          label: (t.display_name ?? t.trader_code ?? t.id ?? "Trader") as string,
        }))
        .filter((t) => Boolean(t.id)),
    [tradersQuery.data],
  );

  useEffect(() => {
    if (!followers.length) {
      setSelectedFollowerId("");
      return;
    }
    if (!selectedFollowerId) {
      setSelectedFollowerId(followers[0]?.id ?? "");
    }
  }, [followers, selectedFollowerId]);

  const approveKyc = useMutation({
    mutationFn: (userId: string) => UsersService.usersUpdateKycStatus(userId, { status: KycStatus.APPROVED }),
    onSuccess: () => {
      toast.success("KYC approved");
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => toast.error(err?.message ?? "Failed to approve KYC"),
  });

  const approveDeposit = useMutation({
    mutationFn: (payload: { transaction_id: string }) => AdminService.adminApproveCryptoDeposit(payload),
    onSuccess: () => {
      toast.success("Deposit approved");
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => toast.error(err?.message ?? "Failed to approve deposit"),
  });

  const rejectDeposit = useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason?: string }) =>
      AdminService.adminRejectCryptoDeposit(transactionId, reason),
    onSuccess: () => {
      toast.success("Deposit rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => toast.error(err?.message ?? "Failed to reject deposit"),
  });

  const pushROIExecution = useMutation({
    mutationFn: (body: ROIExecutionPushRequest) => AdminExecutionsService.adminExecutionsPushRoiExecution(body),
    onSuccess: () => {
      toast.success("ROI pushed to followers");
      setRoiPercent("");
      setRoiSymbol("");
      setRoiNote("");
    },
    onError: (err: Error) => toast.error(err?.message ?? "Failed to push ROI"),
  });



  const handleROIPushSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTraderId) {
      toast.error("Select a trader");
      return;
    }
    if (!selectedFollowerId) {
      toast.error("Select a follower");
      return;
    }
    const roi = Number(roiPercent);
    if (!Number.isFinite(roi)) {
      toast.error("Enter a valid ROI percentage");
      return;
    }
    if (roi < -100 || roi > 1000) {
      toast.error("ROI percentage must be between -100% and 1000%");
      return;
    }
    pushROIExecution.mutate({
      trader_id: selectedTraderId,
      user_id: selectedFollowerId,
      roi_percent: roi,
      symbol: roiSymbol || "BTC/USDT",
      note: roiNote || undefined,
    });
  };


  const pendingKyc: AdminKycItem[] = dashboardQuery.data?.pending_kyc ?? [];
  const pendingDeposits: AdminDepositItem[] = dashboardQuery.data?.pending_deposits ?? [];
  const pendingWithdrawalsCount =
    (dashboardQuery.data as { pending_withdrawals_count?: number } | undefined)?.pending_withdrawals_count ??
    (Array.isArray((dashboardQuery.data as { pending_withdrawals?: unknown } | undefined)?.pending_withdrawals)
      ? ((dashboardQuery.data as { pending_withdrawals?: unknown } | undefined)?.pending_withdrawals as unknown[]).length
      : 0);

  const confirmedDepositsCount = useMemo(
    () => pendingDeposits.filter((d) => d.payment_confirmed_by_user).length,
    [pendingDeposits],
  );
  const unconfirmedDepositsCount = pendingDeposits.length - confirmedDepositsCount;

  const filteredDeposits = useMemo(() => {
    if (depositFilter === "confirmed") {
      return pendingDeposits.filter((d) => d.payment_confirmed_by_user);
    }
    if (depositFilter === "unconfirmed") {
      return pendingDeposits.filter((d) => !d.payment_confirmed_by_user);
    }
    return pendingDeposits;
  }, [pendingDeposits, depositFilter]);

  const pagedDeposits = useMemo(() => {
    if (depositRowsPerPage === -1) {
      return filteredDeposits;
    }
    const start = depositPage * depositRowsPerPage;
    return filteredDeposits.slice(start, start + depositRowsPerPage);
  }, [filteredDeposits, depositPage, depositRowsPerPage]);

  useEffect(() => {
    if (depositRowsPerPage !== -1 && depositPage > 0 && depositPage * depositRowsPerPage >= filteredDeposits.length) {
      setDepositPage(0);
    }
  }, [filteredDeposits.length, depositPage, depositRowsPerPage]);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      toast.success("Address copied to clipboard");
    } catch {
      toast.error("Failed to copy address");
    }
  };

  type SearchOption = {
    label: string;
    type: "user" | "trader" | "deposit" | "kyc";
    id: string;
    helper?: string;
  };

  const searchOptions: SearchOption[] = useMemo(() => {
    const users =
      usersQuery.data?.data?.map((u) => ({
        label: u.full_name || u.email || "User",
        type: "user" as const,
        id: u.id ?? u.email ?? "",
        helper: u.email ?? undefined,
      })) ?? [];

    const traders =
      traderOptions.map((t) => ({
        label: t.label,
        type: "trader" as const,
        id: t.id,
        helper: "Trader",
      })) ?? [];

    const deposits =
      pendingDeposits.map((d) => {
        const isComm =
          d.metadata_payload?.type === "COPY_TRADING_COMMISSION" ||
          (typeof d.description === "string" && d.description.toLowerCase().includes("commission"));
        return {
          label: `${isComm ? "Commission" : "Deposit"} ${formatCurrency(d.amount ?? 0)} - ${d.full_name || d.email}`,
          type: "deposit" as const,
          id: d.id,
          helper: `${d.email} • ${d.crypto_network ?? "Network"}${d.payment_confirmed_by_user ? " • Submitted" : ""}`,
        };
      }) ?? [];

    const kycs =
      pendingKyc.map((k) => ({
        label: k.full_name ?? k.email ?? "KYC",
        type: "kyc" as const,
        id: k.id,
        helper: "KYC pending",
      })) ?? [];

    return [...kycs, ...deposits, ...traders, ...users].filter((o) => o.id);
  }, [pendingDeposits, pendingKyc, traderOptions, usersQuery.data]);

  const scrollToSection = (ref: React.RefObject<HTMLElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSearchSelect = (_event: SyntheticEvent, value: string | SearchOption | null) => {
    const option = typeof value === "string" ? searchOptions.find((o) => o.label === value) : value;
    const nextInput = typeof value === "string" ? value : option?.label ?? "";
    setSearchInput(nextInput);
    if (!option) {
      return;
    }
    if (option.type === "trader") {
      setSelectedTraderId(option.id);
      setOperationsOpen(true);
      scrollToSection(operationsRef);
    } else {
      setApprovalsOpen(true);
      scrollToSection(approvalsRef);
    }
  };

  const actionables = useMemo(
    () => [
      {
        title: "Pending deposits",
        count: pendingDeposits.length,
        helper: `${confirmedDepositsCount} submitted`,
        icon: PaymentsOutlinedIcon,
        onClick: () => {
          setApprovalsOpen(true);
          scrollToSection(approvalsRef);
        },
      },
      {
        title: "Pending KYCs",
        count: pendingKyc.length,
        helper: "Needs review",
        icon: FactCheckOutlinedIcon,
        onClick: () => {
          setApprovalsOpen(true);
          scrollToSection(approvalsRef);
        },
      },
      {
        title: "Pending withdrawals",
        count: pendingWithdrawalsCount,
        helper: "Treasury",
        icon: PaymentsOutlinedIcon,
        onClick: () => {
          setApprovalsOpen(true);
          scrollToSection(approvalsRef);
        },
      },
      {
        title: "ROI push queue",
        count: traderOptions.length,
        helper: "Traders",
        icon: TrendingUpOutlinedIcon,
        onClick: () => {
          setOperationsOpen(true);
          scrollToSection(operationsRef);
        },
      },
    ],
    [pendingDeposits.length, confirmedDepositsCount, pendingKyc.length, pendingWithdrawalsCount, traderOptions.length],
  );

  const globalSearch = (
    <Autocomplete
      size="small"
      options={searchOptions}
      value={null}
      inputValue={searchInput}
      onInputChange={(_, value) => setSearchInput(value)}
      onChange={handleSearchSelect}
      sx={{ minWidth: { xs: 180, sm: 220, md: 260 } }}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search users, traders, tx"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
            <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
              {option.label}
            </Typography>
            {option.helper && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {option.helper}
              </Typography>
            )}
          </Stack>
        </li>
      )}
      clearOnBlur={false}
      blurOnSelect
      freeSolo
    />
  );

  return (
    <AdminDashboardLayout
      title="Admin Dashboard"
      subtitle="Manage approvals, operations, and signals."
      globalSearch={globalSearch}
      actions={dashboardQuery.isFetching ? <CircularProgress size={18} /> : null}
    >
      <Stack spacing={DASHBOARD_GRID_SPACING}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
            gap: { xs: 1, sm: 1.5, md: 2 },
          }}
        >
          {actionables.map((item) => (
            <Paper
              key={item.title}
              elevation={1}
              sx={{
                p: 2,
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {item.icon && <item.icon fontSize="small" color={item.count ? "primary" : "action"} />}
                  <Typography variant="subtitle2" color="text.secondary">
                    {item.title}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="baseline" justifyContent="space-between">
                  <Typography variant="h5" fontWeight={700}>
                    {item.count}
                  </Typography>
                  {item.helper && (
                    <Chip size="small" label={item.helper} variant="outlined" color={item.count ? "primary" : "default"} />
                  )}
                </Stack>
              </Stack>
              <Button
                variant="text"
                size="small"
                sx={{ alignSelf: "flex-start", mt: "auto" }}
                onClick={item.onClick}
                disabled={!item.onClick}
              >
                View
              </Button>
            </Paper>
          ))}
        </Box>

        {/* Approvals panel */}
        <Box ref={approvalsRef}>
          <Panel
            title="Approvals"
            subtitle="Quick actions for compliance and treasury."
            actions={
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
                flexWrap="wrap"
              >
                <Chip size="small" label={`${pendingKyc.length} KYC / ${pendingDeposits.length} deposits`} />
                <Button
                  size="small"
                  variant="text"
                  endIcon={<KeyboardArrowDownIcon sx={{ transform: approvalsOpen ? "rotate(180deg)" : "none" }} />}
                  onClick={() => setApprovalsOpen((v) => !v)}
                >
                  {approvalsOpen ? "Collapse" : "Expand"}
                </Button>
              </Stack>
            }
          >
            {approvalsOpen && (
              <Grid container spacing={2} sx={{ mt: { xs: 0.5, sm: 1 } }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: { xs: 0.5, sm: 0 } }}>
                    KYC queue
                  </Typography>
                  <Stack spacing={1}>
                    {pendingKyc.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No pending KYC.
                      </Typography>
                    )}
                    {pendingKyc.slice(0, 4).map((item) => (
                      <Stack
                        key={item.id}
                        direction="row"
                        spacing={1} justifyContent="space-between" alignItems="flex-start"
                        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1 }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2">{item.full_name ?? item.email}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Submitted: {formatDateTime(item.kyc_submitted_at)}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained" size="small" sx={{ alignSelf: "flex-start" }} onClick={() => approveKyc.mutate(item.id)}
                          disabled={approveKyc.isPending}
                        >
                          Approve
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }} id="deposits">
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, flexWrap: "wrap", gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Deposits queue ({pendingDeposits.length})
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                      <Chip
                        label={`All (${pendingDeposits.length})`}
                        size="small"
                        color={depositFilter === "all" ? "primary" : "default"}
                        variant={depositFilter === "all" ? "filled" : "outlined"}
                        onClick={() => {
                          setDepositFilter("all");
                          setDepositPage(0);
                        }}
                        sx={{ cursor: "pointer", height: 24, fontSize: "0.75rem" }}
                      />
                      <Chip
                        label={`Submitted (${confirmedDepositsCount})`}
                        size="small"
                        color={depositFilter === "confirmed" ? "success" : "default"}
                        variant={depositFilter === "confirmed" ? "filled" : "outlined"}
                        onClick={() => {
                          setDepositFilter("confirmed");
                          setDepositPage(0);
                        }}
                        sx={{ cursor: "pointer", height: 24, fontSize: "0.75rem" }}
                      />
                      <Chip
                        label={`Awaiting (${unconfirmedDepositsCount})`}
                        size="small"
                        color={depositFilter === "unconfirmed" ? "warning" : "default"}
                        variant={depositFilter === "unconfirmed" ? "filled" : "outlined"}
                        onClick={() => {
                          setDepositFilter("unconfirmed");
                          setDepositPage(0);
                        }}
                        sx={{ cursor: "pointer", height: 24, fontSize: "0.75rem" }}
                      />
                    </Stack>
                  </Box>

                  {filteredDeposits.length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 2, textAlign: "center", borderRadius: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {pendingDeposits.length === 0
                          ? "No pending deposits."
                          : `No deposits found matching "${depositFilter}" filter.`}
                      </Typography>
                    </Paper>
                  ) : (
                    <Stack spacing={1.5}>
                      {pagedDeposits.map((deposit) => {
                        const isCommission =
                          deposit.metadata_payload?.type === "COPY_TRADING_COMMISSION" ||
                          (typeof deposit.description === "string" && deposit.description.toLowerCase().includes("commission"));

                        return (
                          <Paper
                            key={deposit.id}
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                              bgcolor: deposit.payment_confirmed_by_user ? "action.hover" : "background.paper",
                              borderColor: deposit.payment_confirmed_by_user ? "success.main" : "divider",
                            }}
                          >
                            {/* Top row: Amount & Status Badges */}
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, flexWrap: "wrap" }}>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                  {formatCurrency(deposit.amount ?? 0)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Created: {formatDateTime(deposit.created_at)}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                {isCommission && (
                                  <Chip
                                    label="COPY TRADING COMMISSION"
                                    size="small"
                                    color="primary"
                                    sx={{ fontWeight: 600, fontSize: "0.68rem", height: 22 }}
                                  />
                                )}
                                {deposit.payment_confirmed_by_user ? (
                                  <Chip
                                    icon={<CheckCircleIcon sx={{ fontSize: "0.95rem !important" }} />}
                                    label="Payment Submitted for Verification"
                                    size="small"
                                    color="success"
                                    sx={{ fontWeight: 600, fontSize: "0.68rem", height: 22 }}
                                  />
                                ) : (
                                  <Chip
                                    icon={<PendingIcon sx={{ fontSize: "0.95rem !important" }} />}
                                    label="Awaiting User Payment"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    sx={{ fontWeight: 600, fontSize: "0.68rem", height: 22 }}
                                  />
                                )}
                              </Stack>
                            </Box>

                            {/* User details */}
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {deposit.full_name ? `${deposit.full_name} (${deposit.email})` : deposit.email}
                              </Typography>
                              {deposit.payment_confirmed_at && (
                                <Typography variant="caption" color="success.main" sx={{ display: "block" }}>
                                  Submitted: {formatDateTime(deposit.payment_confirmed_at)}
                                </Typography>
                              )}
                            </Box>

                            {/* Crypto info & address */}
                            <Box
                              sx={{
                                bgcolor: "background.default",
                                p: 1,
                                borderRadius: 1,
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 500 }}>
                                {deposit.crypto_coin ?? "Crypto"} ({deposit.crypto_network ?? "Network"})
                                {deposit.crypto_amount != null ? ` • ${deposit.crypto_amount} ${deposit.crypto_coin ?? ""}` : ""}
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5, mt: 0.25 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontFamily: "monospace",
                                    wordBreak: "break-all",
                                    color: "text.primary",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {deposit.crypto_address || "No address generated"}
                                </Typography>
                                {deposit.crypto_address && (
                                  <Tooltip title="Copy address">
                                    <IconButton
                                      size="small"
                                      onClick={() => copyToClipboard(deposit.crypto_address!)}
                                      sx={{ p: 0.25, flexShrink: 0 }}
                                    >
                                      <ContentCopyIcon sx={{ fontSize: "0.9rem" }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>

                            {/* Commission Metadata Context */}
                            {isCommission && (
                              <Box
                                sx={{
                                  bgcolor: "action.selected",
                                  border: "1px dashed",
                                  borderColor: "primary.main",
                                  p: 1,
                                  borderRadius: 1,
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main", display: "block" }}>
                                  Copy Trading Context
                                </Typography>
                                {deposit.metadata_payload?.trader_name && (
                                  <Typography variant="caption" sx={{ display: "block" }}>
                                    Trader: <strong>{deposit.metadata_payload.trader_name}</strong>
                                  </Typography>
                                )}
                                {deposit.metadata_payload?.held_released_equity != null && (
                                  <Typography variant="caption" sx={{ display: "block" }}>
                                    Held Released Equity to Unlock:{" "}
                                    <strong>{formatCurrency(deposit.metadata_payload.held_released_equity)}</strong>
                                  </Typography>
                                )}
                                {deposit.metadata_payload?.copy_id && (
                                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontFamily: "monospace", fontSize: "0.7rem" }}>
                                    Copy ID: {deposit.metadata_payload.copy_id}
                                  </Typography>
                                )}
                              </Box>
                            )}

                            {/* Action buttons */}
                            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 0.5 }}>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => {
                                  setDepositToReject(deposit);
                                  setRejectReason("");
                                }}
                                disabled={rejectDeposit.isPending || approveDeposit.isPending}
                              >
                                Reject
                              </Button>
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={() => setDepositToApprove(deposit)}
                                disabled={rejectDeposit.isPending || approveDeposit.isPending}
                              >
                                Approve
                              </Button>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}

                  {filteredDeposits.length > 0 && (
                    <TablePagination
                      component="div"
                      count={filteredDeposits.length}
                      page={depositPage}
                      onPageChange={(_, newPage) => setDepositPage(newPage)}
                      rowsPerPage={depositRowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setDepositRowsPerPage(parseInt(e.target.value, 10));
                        setDepositPage(0);
                      }}
                      rowsPerPageOptions={[5, 10, 25, { label: "All", value: -1 }]}
                      sx={{ borderTop: "1px solid", borderColor: "divider", mt: 1 }}
                    />
                  )}
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Pending withdrawals
                  </Typography>
                  <WithdrawalApprovals />
                </Grid>
              </Grid>
            )}
          </Panel>
        </Box>


        {/* Operations panel */}
        <Box ref={operationsRef}>
        <Panel
          title="Operations"
          subtitle="Simple ROI mode active (general push deprecated)."
          actions={
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1}
              flexWrap="wrap"
            >
              <Chip size="small" label="Simple ROI" color="warning" variant="outlined" />
              <Chip size="small" label={`${traderOptions.length} traders`} color="primary" />
              <Button
                size="small"
                variant="text"
                endIcon={<KeyboardArrowDownIcon sx={{ transform: operationsOpen ? "rotate(180deg)" : "none" }} />}
                onClick={() => setOperationsOpen((v) => !v)}
              >
                {operationsOpen ? "Collapse" : "Expand"}
              </Button>
            </Stack>
          }
        >
          {operationsOpen && (
            <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mt: { xs: 0.5, sm: 1 } }}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ mt: { xs: 0.75, sm: 0 } }}>
                    Select trader & follower
                  </Typography>
                  <TextField
                    id="trader-select"
                    select
                    SelectProps={{
                      native: true,
                      inputProps: {
                        name: "trader-select",
                        title: "Select Trader", // This provides an accessible name
                        "aria-label": "Trader selection", // This also provides an accessible name
                      },
                    }}
                    InputLabelProps={{ shrink: true }}
                    label="Trader"
                    value={selectedTraderId}
                    onChange={(e) => {
                      setSelectedTraderId(e.target.value);
                      setSelectedFollowerId("");
                    }}
                    helperText={
                      selectedTraderId
                        ? followersQuery.isFetching
                          ? "Loading followers..."
                          : followers.length
                          ? `${followers.length} active follower${followers.length === 1 ? "" : "s"}`
                          : "No active followers for this trader"
                        : "Select a trader to load followers"
                    }
                    required
                    size="small"
                  >
                    <option value="" disabled>
                      Select trader
                    </option>
                    {traderOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </TextField>
                  <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
                    {followersQuery.isLoading ? (
                      <Stack spacing={1} sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Loading followers...
                        </Typography>
                      </Stack>
                    ) : followers.length ? (
                      <Table size="small" aria-label="followers table">
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox" />
                            <TableCell>Follower</TableCell>
                            <TableCell align="right">Copy balance</TableCell>
                            <TableCell align="right">Allocated</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {followers.map((f) => (
                            <TableRow
                              key={f.id}
                              hover
                              onClick={() => setSelectedFollowerId(f.id)}
                              selected={f.id === selectedFollowerId}
                              sx={{ cursor: "pointer" }}
                            >
                              <TableCell padding="checkbox">
                                <Radio checked={f.id === selectedFollowerId} size="small" />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                  {f.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {f.email}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">{formatCurrency(f.balance ?? 0)}</TableCell>
                              <TableCell align="right">{formatCurrency(f.allocation ?? 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Stack spacing={0.5} sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          No followers loaded. Choose a trader first.
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <form onSubmit={handleROIPushSubmit}>
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2">Push ROI (simple)</Typography>
                    {selectedFollowerId && (
                      <Chip
                        size="small"
                        color="success"
                        variant="outlined"
                        label="Targeting selected follower"
                        sx={{ alignSelf: "flex-start" }}
                      />
                    )}
                    <TextField
                      label="ROI %"
                      value={roiPercent}
                      onChange={(e) => setRoiPercent(e.target.value)}
                      type="number"
                      inputProps={{ step: "0.1" }}
                      required
                      size="small"
                    />
                    <TextField
                      label="Symbol (optional)"
                      value={roiSymbol}
                      onChange={(e) => setRoiSymbol(e.target.value)}
                      placeholder="e.g., BTC/USDT"
                      size="small"
                    />
                    <TextField
                      label="Note (optional)"
                      value={roiNote}
                      onChange={(e) => setRoiNote(e.target.value)}
                      multiline
                      minRows={2}
                      size="small"
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={pushROIExecution.isPending || traderOptions.length === 0}
                      startIcon={pushROIExecution.isPending ? <CircularProgress size={14} /> : undefined}
                    >
                      Push ROI
                    </Button>
                  </Stack>
                </form>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Pending deposit signal
                  </Typography>
                  <PendingDepositsBanner variant="compact" />
                </Box>
              </Grid>
            </Grid>
          )}
        </Panel>
        </Box>

{/* People & Signals panel */}
        <Panel
          title="People & Signals"
          subtitle="Snapshots of users and activity."
          actions={
            <Button
              size="small"
              variant="text"
              endIcon={<KeyboardArrowDownIcon sx={{ transform: peopleOpen ? "rotate(180deg)" : "none" }} />}
              onClick={() => setPeopleOpen((v) => !v)}
            >
              {peopleOpen ? "Collapse" : "Expand"}
            </Button>
          }
        >
          {peopleOpen && (
            <Grid container spacing={2} sx={{ mt: { xs: 0.5, sm: 1 } }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Recent users
                </Typography>
                <Stack spacing={1}>
                  {(usersQuery.data?.data ?? []).slice(0, 6).map((u: UserPublic) => (
                    <Stack
                      key={u.id}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1 }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2">{u.full_name ?? u.email}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.email}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={u.kyc_status === KycStatus.APPROVED ? "KYC" : "Unverified"}
                        color={u.kyc_status === KycStatus.APPROVED ? "success" : "default"}
                        variant="outlined"
                      />
                    </Stack>
                  ))}
                  {(usersQuery.data?.data?.length ?? 0) === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No users loaded.
                    </Typography>
                  )}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Quick links
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                  {[
                    { label: "KYC review", to: "/admin/kyc-review" },
                    { label: "Withdrawals", to: "/admin/dashboard#withdrawals" },
                    { label: "Deposits", to: "/admin/dashboard#deposits" },
                    { label: "Trader manager", to: "/admin/trader-manager" },
                    { label: "Balance adjustment", to: "/admin/balance-adjustment" },
                  ].map((link) => (
                    <Button key={link.label} size="small" variant="outlined" href={link.to}>
                      {link.label}
                    </Button>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          )}
        </Panel>
      </Stack>

      {/* Approval Confirmation Dialog */}
      <Dialog
        open={Boolean(depositToApprove)}
        onClose={() => setDepositToApprove(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Approve Deposit</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to approve this deposit of{" "}
            <strong>{depositToApprove ? formatCurrency(depositToApprove.amount ?? 0) : ""}</strong> for{" "}
            <strong>{depositToApprove?.full_name ? `${depositToApprove.full_name} (${depositToApprove.email})` : depositToApprove?.email}</strong>?
          </Typography>
          {depositToApprove?.metadata_payload?.type === "COPY_TRADING_COMMISSION" && (
            <Typography variant="caption" color="primary.main" sx={{ mt: 1, display: "block" }}>
              Note: This is a Copy Trading Commission payment. Approving will unlock{" "}
              {depositToApprove.metadata_payload.held_released_equity != null
                ? formatCurrency(depositToApprove.metadata_payload.held_released_equity)
                : "held equity"}{" "}
              to the user's copy trading wallet.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepositToApprove(null)} disabled={approveDeposit.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={approveDeposit.isPending}
            onClick={() => {
              if (depositToApprove) {
                approveDeposit.mutate(
                  { transaction_id: depositToApprove.id },
                  {
                    onSettled: () => setDepositToApprove(null),
                  },
                );
              }
            }}
          >
            {approveDeposit.isPending ? "Approving..." : "Confirm Approval"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Confirmation Dialog */}
      <Dialog
        open={Boolean(depositToReject)}
        onClose={() => {
          setDepositToReject(null);
          setRejectReason("");
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reject Deposit</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to reject this deposit of{" "}
            <strong>{depositToReject ? formatCurrency(depositToReject.amount ?? 0) : ""}</strong> for{" "}
            <strong>{depositToReject?.full_name ? `${depositToReject.full_name} (${depositToReject.email})` : depositToReject?.email}</strong>?
          </Typography>
          <TextField
            label="Rejection Reason (Optional)"
            fullWidth
            size="small"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Payment not received, expired session"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDepositToReject(null);
              setRejectReason("");
            }}
            disabled={rejectDeposit.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={rejectDeposit.isPending}
            onClick={() => {
              if (depositToReject) {
                rejectDeposit.mutate(
                  {
                    transactionId: depositToReject.id,
                    reason: rejectReason.trim() || undefined,
                  },
                  {
                    onSettled: () => {
                      setDepositToReject(null);
                      setRejectReason("");
                    },
                  },
                );
              }
            }}
          >
            {rejectDeposit.isPending ? "Rejecting..." : "Confirm Rejection"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminDashboardLayout>
  );
};




