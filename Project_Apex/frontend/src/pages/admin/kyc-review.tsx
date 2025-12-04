import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { Link } from '@tanstack/react-router';
import { KycService } from '@/api/services/KycService';
import type { KycApplicationPublic } from '@/api/models/KycApplicationPublic';
import type { KycRejectionPayload } from '@/api/models/KycRejectionPayload';
import { AdminDashboardLayout } from '@/components/admin/admin-dashboard-layout';
import { Panel } from '@/components/shared';
import { DASHBOARD_GRID_SPACING } from '@/constants/layout';

export const KycReview = () => {
  const queryClient = useQueryClient();

  const { data: pendingReviews, isLoading } = useQuery({
    queryKey: ['pending-kyc'],
    queryFn: () => KycService.kycListPendingApplications()
  });

  const approveKYC = useMutation({
    mutationFn: (userId: string) => KycService.kycApproveApplication(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-kyc'] });
    },
  });

  const rejectKYC = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => 
      KycService.kycRejectApplication(userId, { reason } as KycRejectionPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-kyc'] });
    },
  });

  const handleApprove = async (userId: string) => {
    await approveKYC.mutateAsync(userId);
  };

  const handleReject = async (userId: string) => {
    const reason = window.prompt('Enter rejection reason:', 'Documents incomplete');
    if (reason) {
      await rejectKYC.mutateAsync({ userId, reason });
    }
  };

  return (
    <AdminDashboardLayout
      title="KYC Review"
      subtitle="Review and approve or reject KYC applications"
      actions={<Chip label={`${pendingReviews?.length || 0} Pending`} color="warning" size="small" />}
    >
      <Stack spacing={DASHBOARD_GRID_SPACING}>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Loading KYC applications...
            </Typography>
          </Stack>
        </Box>
      ) : pendingReviews?.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <Typography variant="body2" color="text.secondary">
            No pending KYC applications
          </Typography>
        </Box>
      ) : (
        <Stack spacing={DASHBOARD_GRID_SPACING}>
          {pendingReviews?.map((application: KycApplicationPublic) => (
            <Panel key={application.id}>
              <Stack spacing={3}>
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  justifyContent="space-between" 
                  alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                  spacing={2}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {application.legal_first_name} {application.legal_last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {application.email} • Submitted {formatDate(application.kyc_submitted_at)}
                    </Typography>
                  </Box>
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={1}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleApprove(application.user_id)}
                      disabled={approveKYC.isPending}
                      sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleReject(application.user_id)}
                      disabled={rejectKYC.isPending}
                      sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}
                    >
                      Reject
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      component={Link} 
                      to={`/admin/kyc-review/${application.user_id}`}
                      sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}
                    >
                      View Details
                    </Button>
                  </Stack>
                </Stack>
                
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {application.date_of_birth}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Phone Number
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {application.phone_number}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Country
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {application.country}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Risk Assessment Score
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {application.risk_assessment_score}/100
                    </Typography>
                  </Grid>
                </Grid>
              </Stack>
            </Panel>
          ))}
        </Stack>
      )}
      </Stack>
    </AdminDashboardLayout>
  );
};

// Helper function to format dates
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
