import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Warning, CheckCircle } from "@mui/icons-material";
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link } from '@tanstack/react-router';
import { FormSectionSkeleton } from '@/components/shared';
import { toast } from '@/providers/enhanced-toast-provider';
import { useAuth } from '@/providers/auth-provider';
import { KycService } from '@/api/services/KycService';
import { KycStatus } from '@/api/models/KycStatus';
import { MaterialDashboardLayout, type MaterialDashboardNavItem } from '@/components/layouts/material-dashboard';
import { toAbsoluteResource } from '@/utils/url';
import type { PersonalInfoForm } from './personal-info';
import type { AddressForm } from './address-verification';
import type { DocumentUploadState } from './document-upload';
import { PersonalInfoStep } from './personal-info';
import { AddressVerificationStep } from './address-verification';
import { DocumentUploadStep } from './document-upload';

const PERSONAL_DEFAULT: PersonalInfoForm = {
  legal_first_name: '',
  legal_last_name: '',
  date_of_birth: '',
  phone_number: '',
  tax_id_number: '',
  occupation: '',
  source_of_funds: 'employment_income',
};

const ADDRESS_DEFAULT: AddressForm = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
};

const DOCUMENT_DEFAULT: DocumentUploadState = {
  id_document_type: 'passport',
  id_front: null,
  id_back: null,
  proof_of_address: null,
};

const STEPS = ['Personal Information', 'Address Verification', 'Document Upload'];

const USER_NAVIGATION: MaterialDashboardNavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: DashboardOutlinedIcon, exact: true },
  { label: 'Long-Term Plans', to: '/plans', icon: TrendingUpOutlinedIcon },
  { label: 'Copy Trading', to: '/dashboard/copy-trading', icon: PeopleOutlinedIcon },
  { label: 'Executions', to: '/dashboard/executions', icon: HistoryOutlinedIcon },
  { label: 'Account', to: '/dashboard/account', icon: AccountBalanceOutlinedIcon },
  { label: 'Settings', to: '/dashboard/settings', icon: SettingsOutlinedIcon },
];

export const KycPage = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const [stepIndex, setStepIndex] = useState(0);
  const [personalInfo, setPersonalInfo] = useState(PERSONAL_DEFAULT);
  const [addressInfo, setAddressInfo] = useState(ADDRESS_DEFAULT);
  const [documents, setDocuments] = useState(DOCUMENT_DEFAULT);
  const [initialisedFromProfile, setInitialisedFromProfile] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['kyc-status'],
    queryFn: () => KycService.kycGetKycStatus(),
  });

  const profileQuery = useQuery({
    queryKey: ['kyc-profile'],
    queryFn: () => KycService.kycGetProfile(),
  });
  const isBootstrapping = statusQuery.isLoading || profileQuery.isLoading;

  const currentStatus: KycStatus = statusQuery.data?.status ?? KycStatus.PENDING;
  const statusInfo = statusQuery.data;
  const isAwaitingReview = currentStatus === KycStatus.UNDER_REVIEW;
  const isApproved = currentStatus === KycStatus.APPROVED;
  const statusClasses: Record<KycStatus, string> = {
    [KycStatus.APPROVED]: 'bg-success-100 text-success-800',
    [KycStatus.UNDER_REVIEW]: 'bg-warning-100 text-warning-900',
    [KycStatus.REJECTED]: 'bg-error-100 text-error-800',
    [KycStatus.PENDING]: 'bg-brand-muted text-brand',
  };

  const userInfo = useMemo(() => (user
    ? {
        name: user.full_name ?? user.email ?? undefined,
        email: user.email ?? undefined,
        avatarUrl: toAbsoluteResource(user.profile_picture_url),
      }
    : null), [user]);

  const backAction = (
    <Button
      component={Link}
      to="/dashboard"
      variant="outlined"
      size="small"
      color="inherit"
      startIcon={<ArrowBackIosNewRoundedIcon fontSize="small" />}
    >
      Back to dashboard
    </Button>
  );

  useEffect(() => {
    if (profileQuery.data && !initialisedFromProfile) {
      const profile = profileQuery.data;
      if (profile) {
        setPersonalInfo((prev) => ({
          ...prev,
          legal_first_name: profile.legal_first_name ?? prev.legal_first_name,
          legal_last_name: profile.legal_last_name ?? prev.legal_last_name,
          date_of_birth: profile.date_of_birth ?? prev.date_of_birth,
          phone_number: profile.phone_number ?? prev.phone_number,
          tax_id_number: profile.tax_id_number ?? prev.tax_id_number,
          occupation: profile.occupation ?? prev.occupation,
          source_of_funds: profile.source_of_funds ?? prev.source_of_funds,
        }));
        setAddressInfo((prev) => ({
          ...prev,
          address_line_1: profile.address_line_1 ?? prev.address_line_1,
          address_line_2: profile.address_line_2 ?? prev.address_line_2,
          city: profile.city ?? prev.city,
          state: profile.state ?? prev.state,
          postal_code: profile.postal_code ?? prev.postal_code,
          country: profile.country ?? prev.country,
        }));
      }
      setInitialisedFromProfile(true);
    }
  }, [profileQuery.data, initialisedFromProfile]);

  const submitMutation = useMutation({
    mutationFn: async (payload: DocumentUploadState) => {
      setSubmissionError(null);

      // Convert date string to proper date format for backend
      const submitPayload = {
        legal_first_name: personalInfo.legal_first_name,
        legal_last_name: personalInfo.legal_last_name,
        date_of_birth: personalInfo.date_of_birth, // Backend expects date format
        phone_number: personalInfo.phone_number,
        tax_id_number: personalInfo.tax_id_number,
        occupation: personalInfo.occupation,
        source_of_funds: personalInfo.source_of_funds,
        investment_strategy: undefined,
        address_line_1: addressInfo.address_line_1,
        address_line_2: addressInfo.address_line_2 ?? null,
        city: addressInfo.city,
        state: addressInfo.state,
        postal_code: addressInfo.postal_code,
        country: addressInfo.country,
      };

      console.log('Submitting KYC data:', submitPayload);
      console.log('Document upload payload:', payload);

      try {
        await KycService.kycSubmitKycInformation(submitPayload);
      } catch (error: any) {
        console.error('KYC submission error:', error);
        console.error('Error details:', error.body || error.response?.data);
        // Extract validation error details from the response
        if (error.body && typeof error.body === 'object') {
          console.error('Error body structure:', JSON.stringify(error.body, null, 2));
          
          // Handle different error response formats
          let errorMessage = 'Validation failed';
          
          if (error.body.detail && Array.isArray(error.body.detail)) {
            // FastAPI validation error format
            const validationErrors = error.body.detail.map((err: any) => {
              return `${err.loc?.join('.') || err.field}: ${err.msg || err.message}`;
            }).join(', ');
            errorMessage = `Validation failed: ${validationErrors}`;
          } else if (error.body.detail && typeof error.body.detail === 'string') {
            // Simple string error
            errorMessage = error.body.detail;
          } else if (typeof error.body === 'object') {
            // Generic object error
            const validationErrors = Object.entries(error.body)
              .map(([field, message]) => `${field}: ${message}`)
              .join(', ');
            errorMessage = `Validation failed: ${validationErrors}`;
          }
          
          throw new Error(errorMessage);
        }
        throw error;
      }

      const uploads: Array<Promise<unknown>> = [];
      if (payload.id_front) {
        uploads.push(KycService.kycUploadKycDocument({
          document_type: payload.id_document_type as any,
          side: 'front' as any,
          file: payload.id_front as any,
        } as any));
      }
      if (payload.id_back) {
        uploads.push(KycService.kycUploadKycDocument({
          document_type: payload.id_document_type as any,
          side: 'back' as any,
          file: payload.id_back as any,
        } as any));
      }
      if (payload.proof_of_address) {
        uploads.push(KycService.kycUploadKycDocument({
          document_type: 'proof_of_address' as any,
          side: 'front' as any,
          file: payload.proof_of_address as any,
        } as any));
      }
      if (uploads.length) {
        await Promise.all(uploads);
      }
    },
    onSuccess: () => {
      setSubmissionMessage('Your documents were submitted successfully. Our compliance team will review them shortly.');
      toast.success('KYC submitted successfully');
      setStepIndex(0);
      setDocuments(DOCUMENT_DEFAULT);
      queryClient.invalidateQueries({ queryKey: ['kyc-status'] });
      queryClient.invalidateQueries({ queryKey: ['kyc-profile'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Something went wrong while submitting your documents.';
      setSubmissionError(message);
      toast.error(message);
    },
  });

  const handleSubmitDocuments = (payload: DocumentUploadState) => {
    submitMutation.mutate(payload);
  };

  const resetAfterSubmission = () => {
    setSubmissionMessage(null);
    setSubmissionError(null);
    setStepIndex(0);
  };

  if (!user) {
    return null;
  }

  const steps = useMemo(() => STEPS, []);
  const locked = isAwaitingReview || isApproved;

  const layoutProps = {
    title: 'KYC Verification',
    subtitle: 'Manage your identity verification',
    navigation: USER_NAVIGATION,
    actions: backAction,
    user: userInfo,
    onLogout: logout,
  } as const;

  const formatDateTime = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  if (isAwaitingReview) {
    const submittedAt = formatDateTime(statusInfo?.submitted_at);

    return (
      <MaterialDashboardLayout {...layoutProps}>
        <Box
          sx={{
            maxWidth: '1100px',
            mx: 'auto',
            py: { xs: 4, md: 6 },
            px: { xs: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <Paper
            elevation={0}
            sx={(theme) => ({
              position: 'relative',
              overflow: 'hidden',
              p: { xs: 3, md: 4 },
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              background: `radial-gradient(circle at 18% 25%, ${alpha(theme.palette.info.light, 0.18)}, transparent 36%), linear-gradient(125deg, ${alpha(theme.palette.info.main, 0.14)}, ${alpha(theme.palette.background.paper, 0.98)})`,
              boxShadow: `0 28px 80px -48px ${alpha(theme.palette.info.main, 0.88)}`,
            })}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Stack spacing={1.25} sx={{ maxWidth: { md: 640 } }}>
                <Typography variant="overline" fontWeight={800} color="info.main" letterSpacing={1}>
                  Submission received
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  Your KYC is under review
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Our compliance team is verifying your details. Reviews typically finish within 24-48 hours. We’ll email you as soon as your verification is complete.
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={1.5}>
                  <Chip label="Under review" color="info" size="small" variant="outlined" />
                  {submittedAt && <Chip label={`Submitted ${submittedAt}`} size="small" />}
                </Stack>
              </Stack>

              <Stack
                spacing={1.25}
                sx={(theme) => ({
                  minWidth: { md: 280 },
                  width: '100%',
                  maxWidth: 320,
                  borderRadius: 2.5,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.22)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.96)}, ${alpha(theme.palette.info.main, 0.08)})`,
                  boxShadow: `0 20px 60px -46px ${alpha(theme.palette.info.main, 0.9)}`,
                  p: 2.25,
                })}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  What to expect next
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You can keep browsing the dashboard while we finish checks. Withdrawals unlock once your verification is approved.
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button href="/dashboard" variant="contained" color="info" fullWidth>
                    Back to dashboard
                  </Button>
                </Stack>
                <Button href="/support" variant="text" color="inherit" size="small" sx={{ alignSelf: 'flex-start', px: 0 }}>
                  Contact support
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={(theme) => ({
              borderRadius: 3,
              p: { xs: 2.5, md: 3 },
              backgroundColor: alpha(theme.palette.background.default, 0.7),
            })}
          >
            <Stack spacing={1.75}>
              <Typography variant="subtitle1" fontWeight={700}>
                While you wait
              </Typography>
              <Stack spacing={1.25} divider={<Divider flexItem />}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <CheckCircle sx={{ color: 'success.main', mt: '2px' }} fontSize="small" />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Portfolio tracking stays live
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Deposit funds and monitor performance as usual. We’ll unlock withdrawals and higher limits once your KYC is cleared.
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Warning sx={{ color: 'warning.main', mt: '2px' }} fontSize="small" />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Need to update your submission?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      If you spot an issue, message support and we can reopen the upload step to keep things moving.
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </MaterialDashboardLayout>
    );
  }

  if (isBootstrapping) {
    return (
      <MaterialDashboardLayout {...layoutProps}>
        <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
          <FormSectionSkeleton fields={4} />
          <FormSectionSkeleton fields={3} />
        </div>
      </MaterialDashboardLayout>
    );
  }

  const pageContent = (
    <div className="mx-auto max-w-5xl space-y-8 py-10">
      <div className="flex flex-col gap-3 rounded-2xl border border-border-secondary bg-secondary p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-fg-primary">Verify your identity</h1>
            <p className="text-sm text-fg-tertiary">
              Complete the three-step process to unlock deposits, withdrawals, and higher trading limits.
            </p>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-fg-tertiary">Current status</span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                statusClasses[currentStatus] ?? statusClasses[KycStatus.PENDING]
              }`}
            >
              {currentStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        {statusInfo?.rejected_reason && currentStatus === KycStatus.REJECTED && (
          <div className="flex items-start gap-3 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-900">
            <Warning className="mt-0.5" sx={{ fontSize: 16 }} aria-hidden="true" />
            <div>
              <p className="font-medium">Your previous submission was rejected</p>
              <p className="text-xs">{statusInfo.rejected_reason}</p>
            </div>
          </div>
        )}

        {locked && (
          <div className="flex items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-900">
            <Warning className="mt-0.5" sx={{ fontSize: 16 }} aria-hidden="true" />
            <div>
              <p className="font-medium">
                {isApproved ? 'Your identity is verified' : 'Submission received'}
              </p>
              <p className="text-xs text-warning-800">
                {isApproved
                  ? 'Thank you! You now have full access to Apex Trading Platform.'
                  : 'Our compliance team is reviewing your documents. We will notify you once the review is complete.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {!locked && (
        <div className="space-y-6">
          <ol className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {steps.map((label, index) => {
              const complete = index < stepIndex;
              const current = index === stepIndex;
              return (
                <li key={label} className="flex flex-1 flex-col items-center gap-2 text-center">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                      complete
                        ? 'bg-success-100 text-success-700'
                        : current
                        ? 'bg-brand-solid text-white'
                        : 'bg-bg-secondary text-fg-tertiary'
                    }`}
                  >
                    {complete ? <CheckCircle sx={{ fontSize: 20 }} aria-hidden="true" /> : index + 1}
                  </span>
                  <span className={`text-xs font-medium ${current ? 'text-fg-primary' : 'text-fg-tertiary'}`}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>

          {submissionMessage && (
            <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-900">
              <p>{submissionMessage}</p>
              <button type="button" className="text-xs font-medium text-success-700 underline" onClick={resetAfterSubmission}>
                Submit again
              </button>
            </div>
          )}

          {submissionError && (
            <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-900">
              {submissionError}
            </div>
          )}

          {stepIndex === 0 && (
            <PersonalInfoStep
              value={personalInfo}
              onChange={setPersonalInfo}
              onNext={(data) => {
                setPersonalInfo(data);
                setStepIndex(1);
              }}
              isSubmitting={submitMutation.isPending}
            />
          )}

          {stepIndex === 1 && (
            <AddressVerificationStep
              value={addressInfo}
              onChange={setAddressInfo}
              onNext={(data) => {
                setAddressInfo(data);
                setStepIndex(2);
              }}
              onBack={() => setStepIndex(0)}
              isSubmitting={submitMutation.isPending}
            />
          )}

          {stepIndex === 2 && (
            <DocumentUploadStep
              value={documents}
              onChange={setDocuments}
              onSubmit={handleSubmitDocuments}
              onBack={() => setStepIndex(1)}
              isSubmitting={submitMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <MaterialDashboardLayout {...layoutProps}>
      {pageContent}
    </MaterialDashboardLayout>
  );
};
