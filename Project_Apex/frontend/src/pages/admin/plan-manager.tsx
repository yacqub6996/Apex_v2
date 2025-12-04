import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AdminLongTermService } from '@/api/services/AdminLongTermService';
import type { LongTermPlanSummary } from '@/api/models/LongTermPlanSummary';
import { Panel } from '@/components/shared';
import { AdminDashboardLayout } from '@/components/admin/admin-dashboard-layout';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export const PlanManagerPage = () => {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [draftMaxValues, setDraftMaxValues] = useState<Record<string, string>>({});

  const plansQuery = useQuery({
    queryKey: ['admin-long-term-plans'],
    queryFn: async () => AdminLongTermService.adminLongTermListLongTermPlansForAdmin(),
  });

  useEffect(() => {
    if (plansQuery.data) {
      const defaults = plansQuery.data.reduce<Record<string, string>>((acc, plan) => {
        acc[plan.id] = String(plan.minimum_deposit ?? 0);
        return acc;
      }, {});
      setDraftValues(defaults);
      const maxDefaults = plansQuery.data.reduce<Record<string, string>>((acc, plan) => {
        acc[plan.id] = plan.maximum_deposit != null ? String(plan.maximum_deposit) : "";
        return acc;
      }, {});
      setDraftMaxValues(maxDefaults);
    }
  }, [plansQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async ({ plan, minimumDeposit, maximumDeposit }: { plan: LongTermPlanSummary; minimumDeposit: number; maximumDeposit?: number | null }) =>
      AdminLongTermService.adminLongTermUpdateLongTermPlan(plan.id, {
        minimum_deposit: minimumDeposit,
        maximum_deposit: maximumDeposit,
      }),
    onSuccess: (updatedPlan) => {
      setNotice({
        type: 'success',
        message: `${updatedPlan.name} minimum deposit updated to ${formatCurrency(updatedPlan.minimum_deposit)}${updatedPlan.maximum_deposit != null ? ` / Max ${formatCurrency(updatedPlan.maximum_deposit)}` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-long-term-plans'] });
      queryClient.invalidateQueries({ queryKey: ['landing-long-term-plans'] });
      queryClient.invalidateQueries({ queryKey: ['long-term-plans'] });
    },
    onError: (error: unknown) => {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update plan minimum deposit',
      });
    },
  });

  const handleInputChange = (planId: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [planId]: value,
    }));
  };

  const handleMaxInputChange = (planId: string, value: string) => {
    setDraftMaxValues((prev) => ({
      ...prev,
      [planId]: value,
    }));
  };

  const handleSave = (plan: LongTermPlanSummary) => {
    const rawValue = draftValues[plan.id] ?? '';
    const parsedMin = parseFloat(rawValue);
    if (!Number.isFinite(parsedMin) || parsedMin <= 0) {
      setNotice({
        type: 'error',
        message: 'Enter a valid positive minimum deposit amount.',
      });
      return;
    }
    const rawMax = draftMaxValues[plan.id] ?? '';
    const parsedMax = rawMax === '' ? null : parseFloat(rawMax);
    if (parsedMax !== null && (!Number.isFinite(parsedMax) || parsedMax <= 0)) {
      setNotice({
        type: 'error',
        message: 'Enter a valid positive maximum deposit amount or leave empty.',
      });
      return;
    }
    if (parsedMax !== null && parsedMax < parsedMin) {
      setNotice({
        type: 'error',
        message: 'Maximum deposit must be greater than or equal to minimum deposit.',
      });
      return;
    }
    if (
      Math.abs(parsedMin - plan.minimum_deposit) < 0.01 &&
      (parsedMax === null || Math.abs(parsedMax - (plan.maximum_deposit ?? 0)) < 0.01)
    ) {
      setNotice({
        type: 'info',
        message: 'No changes detected for this plan.',
      });
      return;
    }
    setNotice(null);
    updateMutation.mutate({
      plan,
      minimumDeposit: parsedMin,
      maximumDeposit: parsedMax ?? undefined,
    });
  };

  const plans = plansQuery.data ?? [];
  const isLoading = plansQuery.isLoading || plansQuery.isFetching;

  return (
    <AdminDashboardLayout
      title="Long-Term Plan Manager"
      subtitle="Adjust minimum deposits for each long-term investment plan. Changes take effect immediately for new allocations."
    >
      <Stack spacing={3}>
        {notice && (
          <Alert severity={notice.type} onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        )}

        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            {plans.map((plan) => {
              const draftValue = draftValues[plan.id] ?? '';
              const draftMaxValue = draftMaxValues[plan.id] ?? '';
              const minChanged =
                draftValue !== '' && Math.abs(parseFloat(draftValue) - (plan.minimum_deposit ?? 0)) > 0.009;
              const maxChanged =
                draftMaxValue !== '' && Math.abs(parseFloat(draftMaxValue) - (plan.maximum_deposit ?? 0)) > 0.009;
              const hasChanged = minChanged || maxChanged;

              return (
                <Panel
                    key={plan.id}
                    title={plan.name}
                    subtitle={`Tier: ${plan.tier?.toUpperCase() ?? 'N/A'}`}
                  >
                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">
                        {plan.description}
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          label="Minimum Deposit (USD)"
                          type="number"
                          value={draftValue}
                          onChange={(event) => handleInputChange(plan.id, event.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          sx={{ width: { xs: '100%', sm: 240 } }}
                          disabled={updateMutation.isPending}
                        />
                        <TextField
                          label="Maximum Deposit (USD)"
                          type="number"
                          value={draftMaxValues[plan.id] ?? ''}
                          onChange={(event) => handleMaxInputChange(plan.id, event.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          sx={{ width: { xs: '100%', sm: 240 } }}
                          disabled={updateMutation.isPending}
                        />
                        <Button
                          variant="contained"
                          onClick={() => handleSave(plan)}
                          disabled={updateMutation.isPending || !hasChanged}
                          startIcon={updateMutation.isPending ? <CircularProgress size={16} /> : undefined}
                          sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}
                        >
                          {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                        </Button>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Active investors: {plan.active_investments} &nbsp;|&nbsp; Total allocated:&nbsp;
                        {formatCurrency(plan.total_allocated ?? 0)}
                      </Typography>
                    </Stack>
                  </Panel>
                );
              })}
            </Stack>
          )}
        </Stack>
    </AdminDashboardLayout>
  );
};
