import { createFileRoute } from '@tanstack/react-router'
import { RouteGuard } from '@/components/auth/route-guard'
import { Box, Typography, Card, CardContent, Grid, Button, Stack, Chip, Paper, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DepositModal } from '@/components/crypto/deposit/DepositModal'
import { WithdrawalModal } from '@/components/crypto/withdrawal/WithdrawalModal'
import { MoveFundsDrawer } from '@/components/dashboard/move-funds-drawer'
import { AccountOverview } from '@/components/dashboard/account-overview'
import { DASHBOARD_GRID_SPACING } from '@/constants/layout'
import { useAuth } from '@/providers/auth-provider'
import { TransactionsService } from '@/api/services/TransactionsService'
import { TransactionStatus, TransactionType } from '@/api'
import { PendingDepositsBanner } from '@/components/dashboard/pending-deposits-banner'

export const Route = createFileRoute('/dashboard/account')({
  component: () => (
    <RouteGuard>
      <AccountPage />
    </RouteGuard>
  ),
})

const AccountPage = () => {
  const { user } = useAuth()
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false)
  const [moveFundsOpen, setMoveFundsOpen] = useState(false)
  const [transactionsModalOpen, setTransactionsModalOpen] = useState(false)

  const transactionsQuery = useQuery({
    queryKey: ['transactions-account'],
    queryFn: () => TransactionsService.transactionsReadTransactions(0, 25),
    staleTime: 15_000,
  })

  const { kycStatusLabel, totalBalance } = useMemo(() => {
    const mainWallet = Number(user?.availableBalance ?? user?.balance ?? 0)
    const copyWallet = Number((user as any)?.copy_trading_wallet_balance ?? 0)
    const longTermWallet = Number((user as any)?.long_term_wallet_balance ?? 0)
    const copyAllocated = Number((user as any)?.allocatedCopyBalance ?? (user as any)?.copy_trading_balance ?? 0)
    const longTermAllocated = Number((user as any)?.longTermBalance ?? (user as any)?.long_term_balance ?? 0)
    const total = mainWallet + copyWallet + longTermWallet + copyAllocated + longTermAllocated
    const kycRaw = (user as any)?.kyc_status as string | undefined
    const label = (kycRaw ?? 'PENDING').replace('_', ' ').toLowerCase()
    return { kycStatusLabel: label, totalBalance: total }
  }, [user])


  const formatStatus = (status?: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return { label: 'Completed', color: 'success' as const };
      case TransactionStatus.PENDING:
        return { label: 'Pending', color: 'warning' as const };
      case TransactionStatus.FAILED:
        return { label: 'Failed', color: 'error' as const };
      case TransactionStatus.CANCELLED:
        return { label: 'Cancelled', color: 'default' as const };
      default:
        return { label: 'Unknown', color: 'default' as const };
    }
  }

  const formatType = (type?: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT:
        return 'Deposit';
      case TransactionType.WITHDRAWAL:
        return 'Withdrawal';
      default:
        return 'Wallet activity';
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const formatDate = (value?: string | null) => {
    if (!value) return 'Just now';
    const d = new Date(value);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const allTransactions = transactionsQuery.data?.data ?? []

  const userFacingTransactions = allTransactions.filter((txn) =>
    txn.transaction_type === TransactionType.DEPOSIT ||
    txn.transaction_type === TransactionType.WITHDRAWAL
  )

  const renderTransactionRow = (txn: (typeof allTransactions)[number]) => {
    const status = formatStatus(txn.status as TransactionStatus | undefined);
    return (
      <Stack
        key={txn.id}
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.25 }}
      >
        <Stack spacing={0.25}>
          <Typography variant="subtitle2" fontWeight={700}>{formatCurrency(txn.amount ?? 0)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatType(txn.transaction_type as TransactionType | undefined)}
            {txn.crypto_coin ? ` - ${txn.crypto_coin}` : ""}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
          <Typography variant="caption" color="text.secondary">
            {formatDate((txn as any).created_at || (txn as any).executed_at || (txn as any).updated_at)}
          </Typography>
          <Chip label={status.label} color={status.color} size="small" variant={status.color === "default" ? "outlined" : "filled"} />
        </Stack>
      </Stack>
    )
  }

  const hasZeroBalance = totalBalance <= 0;
  const isKycApproved = kycStatusLabel.includes('approved');

  return (
    <>
      <Stack spacing={DASHBOARD_GRID_SPACING}>
        {/* Empty State Guidance for Users with Zero Balance */}
        {hasZeroBalance && isKycApproved && (
          <Paper
            elevation={0}
            sx={(theme) => ({
              p: 3,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.info.main, 0.08),
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
            })}
          >
            <Stack spacing={2} alignItems="center" textAlign="center">
              <Box
                sx={(theme) => ({
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.info.main, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Typography variant="h4" component="span">💰</Typography>
              </Box>
              <Box>
                <Typography variant="h6" gutterBottom fontWeight={700}>
                  Ready to fund your account?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Make your first deposit to start copy trading and exploring long-term investment plans.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                onClick={() => setDepositModalOpen(true)}
              >
                Make Your First Deposit
              </Button>
            </Stack>
          </Paper>
        )}

        <Paper
          elevation={0}
          sx={(theme) => ({
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
            background: `radial-gradient(circle at 18% 24%, ${alpha(theme.palette.primary.main, 0.18)}, transparent 32%), linear-gradient(125deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.background.paper, 0.98)})`,
            boxShadow: `0 26px 70px -48px ${alpha(theme.palette.primary.main, 0.9)}`,
          })}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Stack spacing={1.25} sx={{ maxWidth: 720 }}>
              <Typography variant="overline" fontWeight={800} color="primary.main" letterSpacing={1}>
                Account & wallets
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                Control deposits, withdrawals, and allocations from one place
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review wallet totals, shift funds between strategies, and keep verification on track. Charts below stay in sync with your live balances.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1.25}>
                <Chip
                  label={`KYC: ${kycStatusLabel}`}
                  color={kycStatusLabel.includes('approved') ? 'success' : kycStatusLabel.includes('review') ? 'warning' : 'default'}
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: 'capitalize' }}
                />
                <Chip label={`Balance: ${formatCurrency(totalBalance)}`} size="small" variant="outlined" />
              </Stack>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} width={{ xs: '100%', md: 'auto' }}>
              <Button variant="contained" onClick={() => setDepositModalOpen(true)} fullWidth>
                Deposit
              </Button>
              <Button variant="outlined" onClick={() => setWithdrawalModalOpen(true)} fullWidth color="inherit">
                Withdraw
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <PendingDepositsBanner />
        <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                Wallet overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Live allocation gauges and ROI snapshots for every wallet and strategy.
              </Typography>
            </Stack>
            <AccountOverview />
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={1.5} sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={700}>Recent transactions</Typography>
              <Typography variant="body2" color="text.secondary">
                Latest deposits and withdrawals across your wallets.
              </Typography>
            </Stack>
            {transactionsQuery.isLoading ? (
              <Stack spacing={1.5}>
                {[...Array(3)].map((_, idx) => (
                  <Stack key={idx} direction="row" spacing={2} alignItems="center">
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1 }}><Skeleton width="60%" /><Skeleton width="40%" /></Box>
                    <Skeleton width={96} height={28} />
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Stack spacing={1.25}>
                {userFacingTransactions.slice(0, 3).map(renderTransactionRow)}
                {userFacingTransactions.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No deposits or withdrawals yet.</Typography>
                )}
                {userFacingTransactions.length > 3 && (
                  <Box sx={{ pt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setTransactionsModalOpen(true)}
                    >
                      View wallet history
                    </Button>
                  </Box>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Grid container spacing={DASHBOARD_GRID_SPACING}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              variant="outlined"
              sx={(theme) => ({
                borderRadius: 3,
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)}, ${alpha(theme.palette.background.paper, 0.98)})`,
                borderColor: alpha(theme.palette.success.main, 0.3),
              })}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Crypto Deposit
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add funds to your main wallet to deploy into copy trading or long-term allocations.
                </Typography>
                <Button variant="contained" onClick={() => setDepositModalOpen(true)} fullWidth>
                  Make Deposit
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              variant="outlined"
              sx={(theme) => ({
                borderRadius: 3,
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.06)}, ${alpha(theme.palette.background.paper, 0.98)})`,
                borderColor: alpha(theme.palette.warning.main, 0.28),
              })}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Crypto Withdrawal
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Withdraw from any wallet once compliance holds clear.
                </Typography>
                <Button variant="outlined" onClick={() => setWithdrawalModalOpen(true)} fullWidth>
                  Withdraw Crypto
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={DASHBOARD_GRID_SPACING}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Transfer Between Wallets
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Move funds between your main wallet, copy trading wallet, and long-term wallet.
                </Typography>
                <Button variant="outlined" onClick={() => setMoveFundsOpen(true)} fullWidth>
                  Transfer Funds
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Account Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View your transaction history, manage KYC verification, and update account settings.
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" size="small">
                    Transaction History
                  </Button>
                  <Button variant="outlined" size="small">
                    Manage KYC
                  </Button>
                  <Button variant="outlined" size="small">
                    Account Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>

      {/* Funding Modals */}
      <DepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
      />
      <WithdrawalModal
        open={withdrawalModalOpen}
        onClose={() => setWithdrawalModalOpen(false)}
      />
      <MoveFundsDrawer
        open={moveFundsOpen}
        onClose={() => setMoveFundsOpen(false)}
      />

      <Dialog
        open={transactionsModalOpen}
        onClose={() => setTransactionsModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Wallet activity</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 440 }}>
          {transactionsQuery.isLoading ? (
            <Stack spacing={1.5}>
              {[...Array(4)].map((_, idx) => (
                <Stack key={idx} direction="row" spacing={2} alignItems="center">
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}><Skeleton width="60%" /><Skeleton width="40%" /></Box>
                  <Skeleton width={96} height={28} />
                </Stack>
              ))}
            </Stack>
          ) : (
            <Stack spacing={1.25}>
              {userFacingTransactions.map(renderTransactionRow)}
              {userFacingTransactions.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No deposits or withdrawals recorded yet.
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransactionsModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}


