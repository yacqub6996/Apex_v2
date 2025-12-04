import { Box, Chip, Typography } from "@mui/material";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import type { TransactionPublic } from "@/api";
import { PendingApprovalBanner } from "./pending-approval-banner";
import { usePendingDeposits } from "@/services/crypto";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return "Just now";
  const d = new Date(value);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const PendingDepositsBanner = ({ variant = "default" }: { variant?: "default" | "compact" }) => {
  const { data, isLoading } = usePendingDeposits();
  const deposits = data ?? [];

  if (isLoading && !deposits.length) return null;
  if (!deposits.length) return null;

  const totalUsd = deposits.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  return (
    <PendingApprovalBanner<TransactionPublic>
      title="Pending crypto deposits"
      description="Funds will land in your wallet once on-chain confirmations and manual review complete."
      icon={<PaymentsOutlinedIcon fontSize="inherit" />}
      severity="info"
      variant={variant}
      chipLabel={variant === "compact" ? `${deposits.length}` : `${deposits.length} in review`}
      summary={
        <Box>
          <Chip
            size="small"
            label={`Total pending: ${formatCurrency(totalUsd)}`}
            sx={{ mt: 0.5 }}
            variant="outlined"
            color="info"
          />
        </Box>
      }
      items={deposits}
      renderItem={(deposit) => (
        <>
          <Typography variant="body2" fontWeight={700} sx={{ display: "flex", justifyContent: "space-between" }}>
            {formatCurrency(deposit.amount ?? 0)}
            <span>{deposit.crypto_coin ?? "USDT"}</span>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {deposit.crypto_amount ? `${deposit.crypto_amount} ${deposit.crypto_coin ?? ""}` : "Awaiting confirmations"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {deposit.crypto_network ? `${deposit.crypto_network} - ` : ""}
            {formatDate(deposit.created_at)}
          </Typography>
        </>
      )}
    />
  );
};
