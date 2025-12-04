import { useEffect, useState } from 'react';
import { VerifiedUser } from "@mui/icons-material";
import { Box, Button, TextField, Alert, Stack, Typography } from '@mui/material';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import { Panel, SectionHeader } from '@/components/shared';

export type PersonalInfoForm = {
  legal_first_name: string;
  legal_last_name: string;
  date_of_birth: string;
  phone_number: string;
  tax_id_number: string;
  occupation: string;
  source_of_funds: string;
};

type PersonalInfoStepProps = {
  value: PersonalInfoForm;
  onChange: (value: PersonalInfoForm) => void;
  onNext: (value: PersonalInfoForm) => void;
  isSubmitting?: boolean;
};

const SOURCE_OF_FUNDS_OPTIONS = [
  { value: 'employment_income', label: 'Employment Income' },
  { value: 'business_income', label: 'Business Income' },
  { value: 'investments', label: 'Investment Returns' },
  { value: 'savings', label: 'Personal Savings' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'other', label: 'Other' },
];

const emptyForm: PersonalInfoForm = {
  legal_first_name: '',
  legal_last_name: '',
  date_of_birth: '',
  phone_number: '',
  tax_id_number: '',
  occupation: '',
  source_of_funds: 'employment_income',
};

export const PersonalInfoStep = ({ value, onChange, onNext, isSubmitting = false }: PersonalInfoStepProps) => {
  const [formData, setFormData] = useState<PersonalInfoForm>(value ?? emptyForm);

  useEffect(() => {
    setFormData(value ?? emptyForm);
  }, [value]);

  const updateField = <K extends keyof PersonalInfoForm>(field: K, newValue: PersonalInfoForm[K]) => {
    console.log(`Field ${field} updated:`, newValue);
    const updated = { ...formData, [field]: newValue };
    setFormData(updated);
    onChange(updated);
  };

  const handleSubmit = () => {
    onNext(formData);
  };

  const requiredFieldsFilled = 
    formData.legal_first_name?.trim() !== '' &&
    formData.legal_last_name?.trim() !== '' &&
    formData.date_of_birth?.trim() !== '' &&
    formData.phone_number?.trim() !== '' &&
    formData.tax_id_number?.trim() !== '' &&
    formData.occupation?.trim() !== '';

  // Debug logging
  console.log('Form data:', formData);
  console.log('Required fields filled:', requiredFieldsFilled);
  console.log('Individual fields:', {
    firstName: formData.legal_first_name?.trim() !== '',
    lastName: formData.legal_last_name?.trim() !== '',
    dob: formData.date_of_birth?.trim() !== '',
    phone: formData.phone_number?.trim() !== '',
    taxId: formData.tax_id_number?.trim() !== '',
    occupation: formData.occupation?.trim() !== ''
  });

  return (
    <Box sx={{ maxWidth: 768, mx: 'auto' }}>
      <Stack spacing={4}>
        {/* KYC Context Explanation */}
        <Alert 
          severity="info" 
          sx={{ 
            borderRadius: 2,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Why We Need This Information
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Apex Trading Platform is committed to maintaining a secure and compliant trading
            environment. Identity verification helps us:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 1 }}>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Prevent fraud and protect your account from unauthorized access
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Comply with financial regulations (KYC/AML requirements)
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Enable secure deposits and withdrawals
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Ensure fair trading practices for all users
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Your information is encrypted and stored securely. Learn more about how we protect your
            data in our{' '}
            <Button
              variant="text"
              size="small"
              href="/privacy-policy"
              sx={{ 
                textTransform: 'none', 
                p: 0, 
                minWidth: 'auto',
                textDecoration: 'underline',
              }}
            >
              Privacy Policy
            </Button>
            .
          </Typography>
        </Alert>

        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              mx: 'auto',
              width: 64,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              bgcolor: 'primary.light',
              mb: 2,
            }}
          >
            <VerifiedUser sx={{ fontSize: 32, color: 'primary.main' }} />
          </Box>
          <SectionHeader
            variant="h4"
            subtitle="Provide your legal information so we can keep your account secure and compliant with global regulations."
          >
            Identity Verification
          </SectionHeader>
        </Box>

        <Panel>
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2,
              }}
            >
              <TextField
                label="Legal First Name"
                value={formData.legal_first_name}
                onChange={(e) => updateField('legal_first_name', e.target.value)}
                placeholder="Jane"
                required
                variant="outlined"
                fullWidth
              />
              <TextField
                label="Legal Last Name"
                value={formData.legal_last_name}
                onChange={(e) => updateField('legal_last_name', e.target.value)}
                placeholder="Doe"
                required
                variant="outlined"
                fullWidth
              />
              <TextField
                label="Date of Birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
                required
                variant="outlined"
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                label="Phone Number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => updateField('phone_number', e.target.value)}
                placeholder="+1 202-555-0142"
                required
                variant="outlined"
                fullWidth
              />
              <TextField
                label="Tax Identification Number"
                value={formData.tax_id_number}
                onChange={(e) => updateField('tax_id_number', e.target.value)}
                placeholder="SSN or equivalent"
                required
                variant="outlined"
                fullWidth
              />
              <TextField
                label="Occupation"
                value={formData.occupation}
                onChange={(e) => updateField('occupation', e.target.value)}
                placeholder="Software Engineer"
                required
                variant="outlined"
                fullWidth
              />
              <FormControl fullWidth variant="outlined">
                <InputLabel>Source of Funds</InputLabel>
                <Select
                  value={formData.source_of_funds}
                  onChange={(e) => updateField('source_of_funds', e.target.value)}
                  label="Source of Funds"
                >
                  {SOURCE_OF_FUNDS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Security Notice:</strong> Your information is encrypted and stored securely.
                We comply with global KYC/AML regulations to prevent financial crime.
              </Typography>
            </Alert>

            <Button
              fullWidth
              onClick={handleSubmit}
              variant="contained"
              disabled={!requiredFieldsFilled || isSubmitting}
              aria-busy={isSubmitting}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Continue to Address Verification
            </Button>
          </Stack>
        </Panel>
      </Stack>
    </Box>
  );
};
