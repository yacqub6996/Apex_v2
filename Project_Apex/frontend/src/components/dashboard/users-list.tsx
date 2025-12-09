import { useQuery } from "@tanstack/react-query";
import { Avatar, Box, Button, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import type { UserPublic } from "@/api/models/UserPublic";
import { UserRole } from "@/api/models/UserRole";
import { UsersService } from "@/api/services/UsersService";

const formatDateTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "N/A";

const formatCurrency = (value?: number) =>
  typeof value === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value) : "—";

export interface UsersListProps {
  limit?: number; // preview mode when provided
  onInspectKyc?: (user: UserPublic) => void;
  onDeleteUser?: (user: UserPublic) => void;
}

export const UsersList = ({ limit, onInspectKyc, onDeleteUser }: UsersListProps) => {
  const usersQuery = useQuery({
    queryKey: ["admin-users", { limit }],
    queryFn: () => UsersService.usersReadUsers(0, limit ?? 100),
  });

  const users = usersQuery.data?.data ?? [];

  if (usersQuery.isLoading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (users.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" textAlign="center" spacing={0.5} sx={{ py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No users found.
        </Typography>
      </Stack>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>User</TableCell>
            <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Role</TableCell>
            <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>KYC</TableCell>
            <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Balances</TableCell>
            <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Last Login</TableCell>
            {(onInspectKyc || onDeleteUser) && (
              <TableCell sx={{ fontSize: 12, textTransform: "uppercase", color: "text.secondary" }}>Actions</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user: UserPublic) => {
            const initials = (user.full_name?.split(" ") || user.email.split("@")[0].split(" "))
              .slice(0, 2)
              .map((t) => t?.[0] ?? "")
              .join("")
              .toUpperCase();
            const kycColor =
              user.kyc_status?.toLowerCase() === "approved"
                ? "success"
                : user.kyc_status?.toLowerCase() === "pending"
                ? "warning"
                : user.kyc_status?.toLowerCase() === "rejected"
                ? "error"
                : "default";
            return (
              <TableRow key={user.id}>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ width: 24, height: 24, bgcolor: "primary.main", fontSize: "0.75rem" }}>{initials}</Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {user.full_name ?? user.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip label={user.role} size="small" color={user.role === UserRole.ADMIN ? "secondary" : "default"} sx={{ textTransform: "capitalize" }} />
                </TableCell>
                <TableCell>
                  <Chip label={user.kyc_status || "—"} size="small" color={kycColor as any} sx={{ textTransform: "capitalize" }} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    W: {formatCurrency(user.wallet_balance)} • CT: {formatCurrency(user.copy_trading_balance)} • LT: {formatCurrency(user.long_term_balance)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{formatDateTime(user.last_login_at)}</Typography>
                </TableCell>
                {(onInspectKyc || onDeleteUser) && (
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {onInspectKyc && (
                        <Button variant="outlined" size="small" onClick={() => onInspectKyc(user)}>
                          Inspect KYC
                        </Button>
                      )}
                      {onDeleteUser && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => onDeleteUser(user)}
                        >
                          Delete
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
