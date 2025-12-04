import { Box, Button, Container, Typography, Paper, Stack, TextField, Alert } from '@mui/material';
import { Link } from '@tanstack/react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { useState } from 'react';
import { SupportChat } from '@/components/support/support-chat';
import { MaterialDashboardLayout, type MaterialDashboardNavItem } from '@/components/layouts/material-dashboard';
import { useAuth } from '@/providers/auth-provider';
import { toAbsoluteResource } from '@/utils/url';

// Navigation items matching the dashboard layout
const USER_NAVIGATION: MaterialDashboardNavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: DashboardOutlinedIcon, exact: true },
  { label: 'Long-Term Plans', to: '/plans', icon: TrendingUpOutlinedIcon },
  { label: 'Copy Trading', to: '/dashboard/copy-trading', icon: PeopleOutlinedIcon },
  { label: 'Executions', to: '/dashboard/executions', icon: HistoryOutlinedIcon },
  { label: 'Account', to: '/dashboard/account', icon: AccountBalanceOutlinedIcon },
  { label: 'Settings', to: '/dashboard/settings', icon: SettingsOutlinedIcon },
];

export const SupportPage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would send the support request
    setSubmitted(true);
  };

  // User info for dashboard layout
  const userInfo = user
    ? {
        name: user.full_name ?? user.email ?? undefined,
        email: user.email ?? undefined,
        avatarUrl: toAbsoluteResource(user.profile_picture_url),
      }
    : null;

  // Content for the support page
  const supportContent = (
    <Stack spacing={3}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Box
          sx={{
            width: { xs: 48, md: 56 },
            height: { xs: 48, md: 56 },
            borderRadius: '50%',
            bgcolor: 'primary.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <HelpOutlineIcon sx={{ fontSize: { xs: 24, md: 32 }, color: 'primary.main' }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
            Contact Support
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We're here to help with any questions or concerns
          </Typography>
        </Box>
      </Box>

      {submitted && (
        <Alert severity="success">
          <Typography variant="body2">
            Thank you for contacting us! Your message has been received. Our support team will
            respond to you within 24-48 hours at the email address you provided.
          </Typography>
        </Alert>
      )}

      {/* AI Support Assistant */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          AI Support Assistant
        </Typography>
        <SupportChat />
      </Paper>

      {/* Quick Contact Options */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Quick Contact
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <EmailIcon color="primary" sx={{ fontSize: 28, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Email Support
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <a
                  href="mailto:Support@apex-portfolios.org"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  Support@apex-portfolios.org
                </a>
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <EmailIcon color="primary" sx={{ fontSize: 28, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Privacy & Data Inquiries
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <a
                  href="mailto:Support@apex-portfolios.org"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  Support@apex-portfolios.org
                </a>
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Paper>

      {/* Contact Form */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Send Us a Message
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Name"
              name="name"
              required
              fullWidth
              variant="outlined"
              size="medium"
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              required
              fullWidth
              variant="outlined"
              size="medium"
            />
            <TextField
              label="Subject"
              name="subject"
              required
              fullWidth
              variant="outlined"
              size="medium"
            />
            <TextField
              label="Message"
              name="message"
              required
              fullWidth
              multiline
              rows={4}
              variant="outlined"
            />
            <Button type="submit" variant="contained" size="large" fullWidth>
              Send Message
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Common Questions */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Common Questions
        </Typography>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              How long does KYC verification take?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              KYC verification is typically processed within 24-48 hours. You'll receive an
              email notification once your verification is complete.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              How do I reset my password?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click "Forgot password" on the login page and submit your email address. Our
              support team will process your request and send you reset instructions within
              24-48 hours.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Can I deposit without completing KYC?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Yes, you can deposit funds without KYC verification. However, withdrawals
              require completed KYC verification for security and regulatory compliance.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              How do I contact support for urgent issues?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email us at Support@apex-portfolios.org with "URGENT" in the subject line. Our team
              monitors urgent requests and will respond as quickly as possible.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Business Hours */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          bgcolor: 'background.default',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Support Hours
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Our support team is available Monday through Friday, 9:00 AM - 6:00 PM EST. We
          respond to all inquiries within 24-48 hours.
        </Typography>
      </Paper>
    </Stack>
  );

  // If user is authenticated, show with dashboard layout
  if (isAuthenticated && user) {
    return (
      <MaterialDashboardLayout
        title="Support"
        subtitle="Get help and contact our team"
        navigation={USER_NAVIGATION}
        user={userInfo}
        onLogout={logout}
      >
        {supportContent}
      </MaterialDashboardLayout>
    );
  }

  // For unauthenticated users, show standalone page
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Button
          component={Link}
          to="/"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
          variant="text"
        >
          Back to Home
        </Button>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {supportContent}
        </Paper>
      </Container>
    </Box>
  );
};
