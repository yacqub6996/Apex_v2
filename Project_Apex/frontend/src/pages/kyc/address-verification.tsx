import { useEffect, useState } from 'react';
import { Box, Button, TextField, Select, MenuItem, InputLabel, FormControl, Alert, Stack, Typography } from '@mui/material';
import { Panel, SectionHeader } from '@/components/shared';

export type AddressForm = {
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type AddressVerificationProps = {
  value: AddressForm;
  onChange: (value: AddressForm) => void;
  onNext: (value: AddressForm) => void;
  onBack: () => void;
  isSubmitting?: boolean;
};

const COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'DE', label: 'Germany' },
];

const defaultForm: AddressForm = {
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
};

export const AddressVerificationStep = ({ value, onChange, onNext, onBack, isSubmitting = false }: AddressVerificationProps) => {
  const [formData, setFormData] = useState<AddressForm>(value ?? defaultForm);

  useEffect(() => {
    setFormData(value ?? defaultForm);
  }, [value]);

  const updateField = <K extends keyof AddressForm>(field: K, fieldValue: AddressForm[K]) => {
    const updated = { ...formData, [field]: fieldValue };
    setFormData(updated);
    onChange(updated);
  };

  const isValid = 
    formData.address_line_1?.trim() !== '' &&
    formData.city?.trim() !== '' &&
    formData.state?.trim() !== '' &&
    formData.postal_code?.trim() !== '' &&
    formData.country?.trim() !== '';

  return (
    <Box sx={{ maxWidth: 768, mx: 'auto' }}>
      <Stack spacing={4}>
        <Box sx={{ textAlign: 'center' }}>
          <SectionHeader
            variant="h4"
            subtitle="Confirm your residential address so we can align with regulatory requirements."
          >
            Address Verification
          </SectionHeader>
        </Box>

        <Panel>
          <Stack spacing={3}>
            <Stack spacing={2}>
              <TextField
                label="Street Address"
                value={formData.address_line_1}
                onChange={(e) => updateField('address_line_1', e.target.value)}
                placeholder="123 Market Street"
                required
                variant="outlined"
                fullWidth
              />
              <TextField
                label="Apartment, Suite, Unit (optional)"
                value={formData.address_line_2 ?? ''}
                onChange={(e) => updateField('address_line_2', e.target.value)}
                placeholder="Floor 5"
                variant="outlined"
                fullWidth
              />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                <TextField
                  label="City"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  required
                  variant="outlined"
                  fullWidth
                />
                <TextField
                  label="State / Province"
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  required
                  variant="outlined"
                  fullWidth
                />
                <TextField
                  label="Postal Code"
                  value={formData.postal_code}
                  onChange={(e) => updateField('postal_code', e.target.value)}
                  required
                  variant="outlined"
                  fullWidth
                />
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Country</InputLabel>
                  <Select
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    label="Country"
                  >
                    {COUNTRY_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Stack>

            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Proof of Address:</strong> You may be asked to provide a recent utility bill or bank statement that matches this address.
              </Typography>
            </Alert>

            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} justifyContent="space-between">
              <Button
                onClick={onBack}
                variant="text"
                sx={{ textTransform: 'none' }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={() => onNext(formData)}
                disabled={!isValid || isSubmitting}
                aria-busy={isSubmitting || undefined}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Continue to Document Upload
              </Button>
            </Stack>
          </Stack>
        </Panel>
      </Stack>
    </Box>
  );
};
