import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Chip, CircularProgress, Grid, Stack, Typography } from "@mui/material";
import { TradersService } from "@/api/services/TradersService";
import { UsersService } from "@/api/services/UsersService";
import type { TraderCreateRequest } from "@/api/models/TraderCreateRequest";
import type { TraderCreateResponse } from "@/api/models/TraderCreateResponse";
import { TradersList } from "@/components/dashboard/traders-list";
import { TraderCreationForm, type TraderFormData } from "@/components/admin/trader-creation-form";
import { TraderAvatarUpload } from "@/components/admin/trader-avatar-upload";
import { TraderCreatedDialog } from "@/components/admin/trader-created-dialog";
import { AdminDashboardLayout } from "@/components/admin/admin-dashboard-layout";
import { Panel } from "@/components/shared";
import { DASHBOARD_GRID_SPACING } from "@/constants/layout";

export const TraderManager = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<TraderFormData>({
    userId: "",
    displayName: "",
    specialty: "",
    riskLevel: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    isPublic: false,
    copyFeePercentage: 0.0,
    minimumCopyAmount: 100.0,
    totalCopiers: 0,
    totalAssetsUnderCopy: 0,
    averageMonthlyReturn: 0,
  });
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [newTraderId, setNewTraderId] = useState<string | null>(null);

  // Fetch users for the user selection dropdown
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => UsersService.usersReadUsers(0, 100),
  });

  const users = usersQuery.data?.data ?? [];

  // Fetch existing traders to prevent duplicate creation for the same user
  const tradersQuery = useQuery({
    queryKey: ["admin-traders-existing"],
    queryFn: () => TradersService.tradersReadTraders(0, 1000),
  });
  const existingTraderUserIds = new Set((tradersQuery.data?.data ?? []).map(t => t.user_id));

  const createTraderMutation = useMutation<TraderCreateResponse, Error, TraderCreateRequest>({
    mutationFn: (traderData) => TradersService.tradersCreateTrader(traderData),
    onSuccess: (data) => {
      setGeneratedCode(data.trader_code);
      setShowSuccess(true);
      setNewTraderId(data.trader_profile.id);
      queryClient.invalidateQueries({ queryKey: ['admin-traders'] });
    },
    onError: (error: any) => {
      console.error("Error creating trader:", error);
      const errorMessage = error?.response?.data?.detail || 
                          error?.message || 
                          error?.toString() || 
                          'Unknown error occurred';
      alert(`Failed to create trader: ${errorMessage}`);
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.displayName.trim();

    if (!formData.userId || !trimmedName || !formData.specialty) {
      alert("Please fill in all required fields");
      return;
    }

    if (existingTraderUserIds.has(formData.userId)) {
      alert("This user already has a trader profile.");
      return;
    }

    const traderData: TraderCreateRequest = {
      user_id: formData.userId,
      display_name: trimmedName,
      specialty: formData.specialty,
      risk_level: formData.riskLevel as any,
      is_public: formData.isPublic,
      copy_fee_percentage: formData.copyFeePercentage,
      minimum_copy_amount: formData.minimumCopyAmount,
    };

    createTraderMutation.mutate(traderData);
  };

  const handleAvatarSuccess = (_avatarUrl: string, updatedTrader: any) => {
    // Update cache immediately with the full updated trader object
    queryClient.setQueryData(['admin-traders'], (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((trader: any) =>
          trader.id === newTraderId 
            ? updatedTrader
            : trader
        ),
      };
    });
    
    // Refetch to ensure persistence across sessions
    queryClient.refetchQueries({ queryKey: ['admin-traders'] });
  };

  const handleCreateAnother = () => {
    setFormData({
      userId: "",
      displayName: "",
      specialty: "",
      riskLevel: "MEDIUM",
      isPublic: false,
      copyFeePercentage: 0.0,
      minimumCopyAmount: 100.0,
      totalCopiers: 0,
      totalAssetsUnderCopy: 0,
      averageMonthlyReturn: 0,
    });
    setShowSuccess(false);
    setGeneratedCode("");
    setNewTraderId(null);
  };

  const isSubmitting = createTraderMutation.isPending;
  const isFormReady = formData.userId && formData.displayName && formData.specialty;

  return (
    <AdminDashboardLayout
      title="Trader Manager"
      subtitle="Create and manage trader profiles for copy trading functionality."
    >
      <Stack spacing={DASHBOARD_GRID_SPACING}>
        <Grid container spacing={DASHBOARD_GRID_SPACING}>
          {/* Create Trader Form */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Panel title="Create New Trader">
              <Stack spacing={3}>
                <TraderCreationForm
                  formData={formData}
                  users={users}
                  existingTraderUserIds={existingTraderUserIds}
                  isSubmitting={isSubmitting}
                  onInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                />

                {newTraderId && (
                  <TraderAvatarUpload
                    traderId={newTraderId}
                    traderName={formData.displayName}
                    onSuccess={handleAvatarSuccess}
                  />
                )}
              </Stack>
            </Panel>
          </Grid>

          {/* Success Message & Status */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Stack spacing={DASHBOARD_GRID_SPACING}>
              {showSuccess && (
                <TraderCreatedDialog
                  traderCode={generatedCode}
                  onCreateAnother={handleCreateAnother}
                />
              )}

              {/* Instructions */}
              <Panel title="How to Create a Trader">
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    1. Select a user from the system who will become a trader
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    2. Provide a display name that will be shown to other users
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    3. Choose the trader's specialty and risk level
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    4. Optionally make the trader public for copy trading
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    5. A unique 6-8 character trader code will be generated
                  </Typography>
                </Stack>
              </Panel>

              {/* Status */}
              <Panel title="Current Status">
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Form Ready:
                    </Typography>
                    <Chip
                      label={isFormReady ? "Ready" : "Incomplete"}
                      color={isFormReady ? "success" : "warning"}
                      size="small"
                    />
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Service Status:
                    </Typography>
                    <Chip label="Operational" color="primary" size="small" />
                  </Stack>
                  {usersQuery.isLoading || tradersQuery.isLoading ? (
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="text.secondary">
                        Loading data...
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>
              </Panel>
            </Stack>
          </Grid>
        </Grid>

        {/* Existing Traders List */}
        <Panel title="Existing Traders">
          <TradersList />
        </Panel>
      </Stack>
    </AdminDashboardLayout>
  );
};
