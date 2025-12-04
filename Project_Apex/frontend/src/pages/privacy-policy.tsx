import { Box, Button, Container, Typography, Paper, Stack, Divider } from '@mui/material';
import { Link } from '@tanstack/react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export const PrivacyPolicy = () => {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        <Button
          component={Link}
          to="/"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
          variant="text"
        >
          Back to Home
        </Button>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Privacy Policy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Last Updated: November 16, 2024
          </Typography>

          <Divider sx={{ mb: 4 }} />

          <Stack spacing={4}>
            {/* Introduction */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Introduction
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Apex Trading Platform ("Apex," "we," "us," or "our") is committed to protecting your
                privacy and ensuring the security of your personal information. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your information when you use
                our trading platform and related services.
              </Typography>
              <Typography variant="body1" color="text.secondary">
                By using Apex Trading Platform, you agree to the collection and use of information in
                accordance with this policy. If you do not agree with our policies and practices,
                please do not use our services.
              </Typography>
            </Box>

            {/* Information We Collect */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Information We Collect
              </Typography>

              <Typography variant="h6" fontWeight={500} sx={{ mt: 2, mb: 1 }}>
                Personal Information
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                When you register for an account or complete KYC (Know Your Customer) verification, we
                collect:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Full legal name and date of birth
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Email address and phone number
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Residential address and postal code
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Government-issued identification documents (passport, driver's license, etc.)
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Tax identification number (SSN or equivalent)
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Occupation and source of funds information
                </Typography>
                <Typography component="li" variant="body1">
                  Profile picture (optional)
                </Typography>
              </Box>

              <Typography variant="h6" fontWeight={500} sx={{ mt: 2, mb: 1 }}>
                Financial Information
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                To provide our trading services, we collect and process:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Transaction history and trading activity
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Wallet addresses and cryptocurrency holdings
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Deposit and withdrawal records
                </Typography>
                <Typography component="li" variant="body1">
                  Investment strategy preferences
                </Typography>
              </Box>

              <Typography variant="h6" fontWeight={500} sx={{ mt: 2, mb: 1 }}>
                Technical Information
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We automatically collect certain information when you use our platform:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  IP address, browser type, and operating system
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Device identifiers and usage data
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Login timestamps and session duration
                </Typography>
                <Typography component="li" variant="body1">
                  Pages visited and features used
                </Typography>
              </Box>
            </Box>

            {/* How We Use Your Information */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                How We Use Your Information
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We use your information for the following purposes:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Account Management:</strong> To create and maintain your account, authenticate
                  your identity, and provide customer support
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>KYC/AML Compliance:</strong> To verify your identity, prevent fraud, and comply
                  with legal and regulatory requirements (Know Your Customer and Anti-Money Laundering)
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Service Delivery:</strong> To process transactions, execute trades, and provide
                  copy trading and investment services
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Security:</strong> To detect and prevent unauthorized access, fraud, and other
                  malicious activities
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Communication:</strong> To send you important updates, security alerts, and
                  service notifications (email verification is currently processed manually)
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Platform Improvement:</strong> To analyze usage patterns and improve our
                  services, features, and user experience
                </Typography>
                <Typography component="li" variant="body1">
                  <strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and
                  legal processes
                </Typography>
              </Box>
            </Box>

            {/* Data Security */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Data Security
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We implement industry-standard security measures to protect your personal information:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Encryption:</strong> All data transmitted to and from our platform is encrypted
                  using SSL/TLS protocols
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Secure Storage:</strong> Personal information is stored in encrypted databases
                  with restricted access
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Access Controls:</strong> Only authorized personnel have access to personal data,
                  and all access is logged and monitored
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Regular Audits:</strong> We conduct regular security audits and vulnerability
                  assessments
                </Typography>
                <Typography component="li" variant="body1">
                  <strong>Authentication:</strong> Multi-factor authentication and secure password hashing
                  protect user accounts
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                While we strive to protect your information, no method of transmission over the internet
                or electronic storage is 100% secure. We cannot guarantee absolute security but
                continuously work to maintain the highest security standards.
              </Typography>
            </Box>

            {/* Information Sharing */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Information Sharing and Disclosure
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We do not sell your personal information. We may share your information only in the
                following circumstances:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Service Providers:</strong> With trusted third-party service providers who assist
                  in operating our platform (e.g., cloud hosting, payment processing, KYC verification)
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Legal Requirements:</strong> When required by law, court order, or government
                  regulation, or to protect our legal rights
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Fraud Prevention:</strong> To prevent fraud, security threats, or illegal
                  activities
                </Typography>
                <Typography component="li" variant="body1">
                  <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of
                  assets, your information may be transferred to the acquiring entity
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                All third parties with access to your information are required to maintain
                confidentiality and use the information only for specified purposes.
              </Typography>
            </Box>

            {/* Data Retention */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Data Retention
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We retain your personal information for as long as necessary to:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Provide our services and maintain your account
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Comply with legal and regulatory obligations (typically 5-7 years for financial records)
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  Resolve disputes and enforce our agreements
                </Typography>
                <Typography component="li" variant="body1">
                  Prevent fraud and maintain security
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                After the retention period expires, we securely delete or anonymize your information.
              </Typography>
            </Box>

            {/* Your Rights */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Your Rights and Choices
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Depending on your jurisdiction, you may have the following rights:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Access:</strong> Request a copy of the personal information we hold about you
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Correction:</strong> Request correction of inaccurate or incomplete information
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Deletion:</strong> Request deletion of your personal information (subject to
                  legal retention requirements)
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Data Portability:</strong> Request a copy of your data in a structured,
                  machine-readable format
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Objection:</strong> Object to certain processing of your information
                </Typography>
                <Typography component="li" variant="body1">
                  <strong>Withdrawal of Consent:</strong> Withdraw consent for processing where we rely on
                  your consent
                </Typography>
              </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                  To exercise these rights, please contact us at{' '}
                  <Typography component="span" color="primary.main" fontWeight={600}>
                    Support@apex-portfolios.org
                  </Typography>
                  . We will respond to your request within 30 days.
                </Typography>
            </Box>

            {/* Cookies */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Cookies and Tracking Technologies
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We use cookies and similar tracking technologies to enhance your experience:
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: 'text.secondary' }}>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Essential Cookies:</strong> Required for the platform to function (e.g., session
                  management, authentication)
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                  <strong>Performance Cookies:</strong> Help us understand how users interact with our
                  platform to improve services
                </Typography>
                <Typography component="li" variant="body1">
                  <strong>Preference Cookies:</strong> Remember your settings and preferences
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                You can control cookies through your browser settings, but disabling certain cookies may
                limit your ability to use some features of our platform.
              </Typography>
            </Box>

            {/* International Transfers */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                International Data Transfers
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Your information may be transferred to and processed in countries other than your country
                of residence. We ensure that such transfers comply with applicable data protection laws and
                that appropriate safeguards are in place to protect your information.
              </Typography>
            </Box>

            {/* Children's Privacy */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Children's Privacy
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Our services are not directed to individuals under the age of 18. We do not knowingly
                collect personal information from children. If we become aware that we have collected
                information from a child without parental consent, we will take steps to delete that
                information promptly.
              </Typography>
            </Box>

            {/* Changes to Policy */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Changes to This Privacy Policy
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We may update this Privacy Policy from time to time to reflect changes in our practices or
                for legal, regulatory, or operational reasons. We will notify you of any material changes
                by posting the updated policy on our platform and updating the "Last Updated" date.
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Your continued use of our services after any changes indicates your acceptance of the
                updated Privacy Policy.
              </Typography>
            </Box>

            {/* Contact Information */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Contact Us
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data
                practices, please contact us:
              </Typography>
              <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body1" fontWeight={600} gutterBottom>
                    Apex Trading Platform
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Website:{' '}
                    <Typography component="span" color="primary.main" fontWeight={600}>
                      www.apex-portfolios.org
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Email:{' '}
                    <Typography component="span" color="primary.main" fontWeight={600}>
                      Support@apex-portfolios.org
                    </Typography>
                  </Typography>
              </Box>
            </Box>

            {/* Compliance */}
            <Box>
              <Typography variant="h6" fontWeight={500} gutterBottom>
                Regulatory Compliance
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Apex Trading Platform complies with applicable data protection regulations including GDPR
                (General Data Protection Regulation), CCPA (California Consumer Privacy Act), and other
                regional privacy laws. We are committed to maintaining the highest standards of data
                protection and privacy.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
