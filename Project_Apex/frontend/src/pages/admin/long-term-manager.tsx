import { useMemo, useState, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AdminDashboardLayout } from "@/components/admin/admin-dashboard-layout";
import { PlanManagerPage } from "@/pages/admin/plan-manager";
import { AdminLongTermService } from "@/api/services/AdminLongTermService";
import type { LongTermRoiPushRequest } from "@/api/models/LongTermRoiPushRequest";
import type { LongTermRoiPushResponse } from "@/api/models/LongTermRoiPushResponse";
import type { PlanInvestorPublic } from "@/api/models/PlanInvestorPublic";
import type { LongTermUserRoiPushRequest } from "@/api/models/LongTermUserRoiPushRequest";
import { getTierRange } from "@/constants/long-term-tiers";
import { toast } from "react-toastify";
import { Panel } from "@/components/shared";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export const LongTermManager = () => {
  const queryClient = useQueryClient();

  const longTermPlansQuery = useQuery({
    queryKey: ["admin-long-term-plans"],
    queryFn: () => AdminLongTermService.adminLongTermListLongTermPlansForAdmin(),
  });

  const longTermPlans = longTermPlansQuery.data ?? [];

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [longTermRoiPercent, setLongTermRoiPercent] = useState<string>("");
  const [longTermNote, setLongTermNote] = useState<string>("");
  const [simplifiedMode, setSimplifiedMode] = useState<boolean>(false);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");

  const selectedLongTermPlan = useMemo(
    () => longTermPlans.find((plan) => plan.id === selectedPlanId),
    [longTermPlans, selectedPlanId],
  );

  const investorsQuery = useQuery({
    queryKey: ["admin-plan-investors", selectedPlanId],
    queryFn: () => AdminLongTermService.adminLongTermListPlanInvestors(selectedPlanId),
    enabled: !!selectedPlanId && simplifiedMode,
  });
  const investors = (investorsQuery.data ?? []) as PlanInvestorPublic[];

  const totals = useMemo(() => {
    const investors = longTermPlans.reduce((sum, p) => sum + (p.active_investments ?? 0), 0);
    const allocated = longTermPlans.reduce((sum, p) => sum + (p.total_allocated ?? 0), 0);
    return { investors, allocated };
  }, [longTermPlans]);

  const pushLongTermROI = useMutation<LongTermRoiPushResponse, Error, LongTermRoiPushRequest>({
    mutationFn: (requestBody) => AdminLongTermService.adminLongTermPushLongTermRoi(requestBody),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-long-term-plans"] });
      queryClient.invalidateQueries({ queryKey: ["execution-feed"] });
      queryClient.invalidateQueries({ queryKey: ["long-term-investments"] });
      queryClient.invalidateQueries({ queryKey: ["long-term-roi-history"] });
      toast.success(`Long-term ROI push successful!\n${data.message}\nTotal ROI: ${formatCurrency(data.total_roi_amount)}`);
      setSelectedPlanId("");
      setLongTermRoiPercent("");
      setLongTermNote("");
    },
    onError: (error) => {
      toast.error(`Failed to push long-term ROI: ${error.message}`);
    },
  });

  const pushLongTermROIForUser = useMutation<LongTermRoiPushResponse, Error, LongTermUserRoiPushRequest>({
    mutationFn: (requestBody) => AdminLongTermService.adminLongTermPushLongTermRoiForUser(requestBody),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-long-term-plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-plan-investors", selectedPlanId] });
      queryClient.invalidateQueries({ queryKey: ["long-term-roi-history"] });
      toast.success(`Long-term ROI push (single) successful!\n${data.message}\nTotal ROI: ${formatCurrency(data.total_roi_amount)}`);
      setLongTermRoiPercent("");
      setLongTermNote("");
      setSelectedInvestorId("");
    },
    onError: (error) => {
      toast.error(`Failed to push long-term ROI (single): ${error.message}`);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlanId || !longTermRoiPercent) return;
    const roiValue = Number(longTermRoiPercent);
    if (simplifiedMode) {
      if (!selectedInvestorId) return;
      pushLongTermROIForUser.mutate({ plan_id: selectedPlanId, user_id: selectedInvestorId, roi_percent: roiValue, note: longTermNote.trim() || undefined });
    } else {
      pushLongTermROI.mutate({ plan_id: selectedPlanId, roi_percent: roiValue, note: longTermNote.trim() || undefined });
    }
  };

  return (
    <AdminDashboardLayout
      title="Long-Term Plans"
      subtitle="Manage plans and push ROI allocations"
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3,
        }}
      >
        <Panel
          title="Long-term plans"
          subtitle="AI-managed allocations overview"
          actions={<Chip label={`${longTermPlans.length} plans`} size="small" color="secondary" />}
        >
          {longTermPlansQuery.isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 3 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Loading plan metrics...
              </Typography>
            </Box>
          ) : longTermPlansQuery.isError ? (
            <Typography variant="body2" color="error.main">Unable to load long-term plan metrics.</Typography>
          ) : longTermPlans.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No long-term plans are configured yet.</Typography>
          ) : (
            <Stack spacing={2}>
              {longTermPlans.map((plan) => (
                <Box
                  key={plan.id}
                  sx={{
                    borderRadius: 2,
                    border: "none",
                    boxShadow: (theme) => `0px 1px 3px ${alpha(theme.palette.common.black, 0.04)}`,
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {plan.name}
                      </Typography>
                      {plan.description && (
                        <Typography variant="caption" color="text.secondary">
                          {plan.description}
                        </Typography>
                      )}
                    </Box>
                    <Chip size="small" color="primary" sx={{ textTransform: 'capitalize' }} label={plan.tier.toLowerCase().replace(/_/g, " ")} />
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">Deposit range</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {(() => { const r = getTierRange(plan.tier); return r ? `${formatCurrency(r.min)}–${formatCurrency(r.max)}` : formatCurrency(plan.minimum_deposit) })()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Active investors</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{plan.active_investments}</Typography>
                    </Box>
                    <Box sx={{ gridColumn: { xs: 'span 2', md: 'span 1' } }}>
                      <Typography variant="caption" color="text.secondary">Total allocated</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(plan.total_allocated)}</Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
              <Box
                sx={{
                  borderRadius: 2,
                  border: "none",
                  boxShadow: (theme) => `0px 1px 3px ${alpha(theme.palette.common.black, 0.04)}`,
                  p: 2,
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total investors</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{totals.investors}</Typography>
                  </Box>
                  <Box sx={{ gridColumn: { xs: 'span 2', md: 'span 1' } }}>
                    <Typography variant="caption" color="text.secondary">Total allocated</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(totals.allocated)}</Typography>
                  </Box>
                </Box>
              </Box>
            </Stack>
          )}
        </Panel>

        {/* Inline Plan Manager CRUD */}
        <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
          <PlanManagerPage />
        </Box>

        <Panel
          title="Long-term ROI controls"
          subtitle="Allocate ROI across managed plans"
          actions={<Chip label={`${totals.investors} active investors`} color="secondary" size="small" />}
        >
          <Stack spacing={2}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ flexWrap: 'wrap' }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'max-content' }}>ROI Mode:</Typography>
              <Button variant={simplifiedMode ? 'outlined' : 'contained'} size="small" onClick={() => setSimplifiedMode(false)} sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}>Normal (All Investors)</Button>
              <Button variant={simplifiedMode ? 'contained' : 'outlined'} size="small" onClick={() => setSimplifiedMode(true)} sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}>Simplified (Individual)</Button>
              {simplifiedMode && <Chip size="small" color="primary" label="Individual ROI mode" />}
            </Stack>
            
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 2,
              }}
            >
              <FormControl fullWidth size="small">
                <InputLabel id="long-term-plan-label">Plan</InputLabel>
                <Select
                  labelId="long-term-plan-label"
                  label="Plan"
                  value={selectedPlanId}
                  onChange={(event) => setSelectedPlanId(event.target.value as string)}
                  required
                >
                  <MenuItem value="">Select a plan</MenuItem>
                  {longTermPlans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.name} – {plan.active_investments} investors
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {simplifiedMode && (
                <FormControl fullWidth size="small">
                  <InputLabel id="long-term-investor-label">User</InputLabel>
                  <Select
                    labelId="long-term-investor-label"
                    label="User"
                    value={selectedInvestorId}
                    onChange={(event) => setSelectedInvestorId(event.target.value as string)}
                    disabled={!selectedPlanId || investorsQuery.isLoading}
                    required={simplifiedMode}
                  >
                    <MenuItem value="">Select a user</MenuItem>
                    {investors.map((i) => (
                      <MenuItem key={i.user_id} value={i.user_id}>
                        {i.email} ({formatCurrency(i.allocation)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <TextField
                label="ROI %"
                type="number"
                size="small"
                value={longTermRoiPercent}
                onChange={(event) => setLongTermRoiPercent(event.target.value)}
                inputProps={{ step: 0.01, min: -1000, max: 1000 }}
                placeholder="e.g. 4.5"
                required
              />
              <TextField
                label="Note"
                size="small"
                value={longTermNote}
                onChange={(event) => setLongTermNote(event.target.value)}
                placeholder="Optional context"
                multiline
                minRows={1}
                maxRows={3}
              />
              <Box sx={{ gridColumn: { xs: '1', md: 'span 3' }, display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
                <Button type="submit" variant="contained" size="small" disabled={(simplifiedMode ? pushLongTermROIForUser.isPending : pushLongTermROI.isPending) || !selectedPlanId || !longTermRoiPercent || (simplifiedMode && !selectedInvestorId)} sx={{ minHeight: 44, width: { xs: '100%', md: 'auto' } }}>
                  {(simplifiedMode ? pushLongTermROIForUser.isPending : pushLongTermROI.isPending) ? "Pushing..." : (simplifiedMode ? "Push individual ROI" : "Push long-term ROI")}
                </Button>
              </Box>
            </Box>

            {selectedLongTermPlan && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Selected plan snapshot
                </Typography>
                <Box sx={{ borderTop: 1, borderColor: 'divider', boxShadow: (theme) => `0px 1px 3px ${alpha(theme.palette.common.black, 0.04)}`, mb: 1 }} />
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Deposit range
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {(() => {
                        const r = getTierRange(selectedLongTermPlan.tier);
                        return r ? `${formatCurrency(r.min)}–${formatCurrency(r.max)}` : formatCurrency(selectedLongTermPlan.minimum_deposit);
                      })()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Active investors
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedLongTermPlan.active_investments}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total allocated
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(selectedLongTermPlan.total_allocated)}
                    </Typography>
                  </Box>
                </Box>
                {selectedLongTermPlan.description && (
                  <Typography variant="body2" color="text.secondary" mt={1.5}>
                    {selectedLongTermPlan.description}
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        </Panel>
      </Box>
    </AdminDashboardLayout>
  );
};
