import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { Avatar } from '@mui/material';
import { AdminSimulationsService } from '@/api/services/AdminSimulationsService';
import type { PendingWithdrawal } from '@/api/models/PendingWithdrawal';

export const WithdrawalApprovals: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: pendingWithdrawals, isLoading } = useQuery({
    queryKey: ['admin-pending-withdrawals'],
    queryFn: () => AdminSimulationsService.adminSimulationsGetPendingWithdrawals(),
  });

  const approveMutation = useMutation({
    mutationFn: (transactionId: string) =>
      AdminSimulationsService.adminSimulationsApproveWithdrawal(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason: string }) =>
      AdminSimulationsService.adminSimulationsRejectWithdrawal(transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    }).format(new Date(value));

  const handleApprove = (withdrawal: PendingWithdrawal) => {
    if (window.confirm(`Approve withdrawal of ${formatCurrency(withdrawal.amount)} for ${withdrawal.email}?`)) {
      approveMutation.mutate(withdrawal.id);
    }
  };

  const handleReject = (withdrawal: PendingWithdrawal) => {
    const reason = window.prompt('Enter rejection reason:', 'Insufficient funds');
    if (reason) {
      rejectMutation.mutate({
        transactionId: withdrawal.id,
        reason,
      });
    }
  };

  const withdrawals = pendingWithdrawals?.data || [];
  const renderSource = (source?: string) => {
    const s = (source || '').toUpperCase();
    if (s === 'COPY_TRADING_WALLET') return 'From: Copy Trading Wallet';
    if (s === 'LONG_TERM_WALLET') return 'From: Long-Term Wallet';
    if (s === 'ACTIVE_ALLOCATION') return 'From: Active Allocation';
    return source ? `From: ${source}` : 'From: Unknown';
  };

  return (
    <>
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-tertiary mt-2">Loading withdrawals...</p>
          </div>
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="text-center py-2">
          <div className="text-tertiary mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-tertiary">No pending withdrawal requests</p>
          <p className="text-sm text-tertiary mt-1">All withdrawal requests have been processed</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Chip label={`${withdrawals.length} pending`} color="warning" size="small" />
            <Button size="small" variant="contained" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-pending-withdrawals'] })}>
              Refresh
            </Button>
          </div>

          <div className="space-y-3">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="rounded-xl border border-secondary p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: 'primary.main',
                        fontSize: '0.75rem'
                      }}
                    >
                      {withdrawal.email.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center space-x-2">
                        <p className="font-medium text-primary truncate">
                          {withdrawal.email}
                        </p>
                        <Chip label="Pending" color="primary" size="small" />
                      </div>
                      <p className="mb-1 text-sm text-tertiary">{withdrawal.description}</p>
                      {withdrawal.plan_name && (
                        <p className="text-xs text-tertiary">Plan: {withdrawal.plan_name}</p>
                      )}
                      <p className="text-xs text-tertiary">{renderSource(withdrawal.source)}</p>
                      <p className="text-xs text-tertiary">
                        Requested {formatDateTime(withdrawal.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="ml-4 text-right">
                    <p className="mb-2 text-lg font-semibold text-primary">
                      {formatCurrency(withdrawal.amount)}
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        size="small"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        variant="contained"
                        onClick={() => handleApprove(withdrawal)}
                        aria-busy={approveMutation.isPending && approveMutation.variables === withdrawal.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        variant="contained"
                        onClick={() => handleReject(withdrawal)}
                        aria-busy={rejectMutation.isPending && rejectMutation.variables?.transactionId === withdrawal.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(approveMutation.isError || rejectMutation.isError) && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">
            {approveMutation.error instanceof Error
              ? approveMutation.error.message
              : rejectMutation.error instanceof Error
              ? rejectMutation.error.message
              : 'An error occurred'}
          </p>
        </div>
      )}

      {(approveMutation.isSuccess || rejectMutation.isSuccess) && (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">
            Withdrawal request processed successfully.
          </p>
        </div>
      )}
    </>
  );
};
