import { useEffect, useState } from 'react';
import { Box, Button, Select, MenuItem, InputLabel, FormControl, Alert, Stack, Typography } from '@mui/material';
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Panel, SectionHeader } from '@/components/shared';

export type DocumentUploadState = {
  id_document_type: 'passport' | 'drivers_license' | 'national_id';
  id_front?: File | null;
  id_back?: File | null;
  proof_of_address?: File | null;
};

type DocumentUploadProps = {
  value: DocumentUploadState;
  onChange: (value: DocumentUploadState) => void;
  onSubmit: (value: DocumentUploadState) => void;
  onBack: () => void;
  isSubmitting?: boolean;
};

const ID_DOCUMENT_OPTIONS = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'national_id', label: 'National ID' },
];

const DEFAULT_STATE: DocumentUploadState = {
  id_document_type: 'passport',
  id_front: null,
  id_back: null,
  proof_of_address: null,
};

type FileBoxProps = {
  label: string;
  description?: string;
  acceptedTypes?: string;
  file?: File | null;
  onSelect: (file: File | null) => void;
};

const FileUploadBox = ({ label, description, acceptedTypes = 'image/*,application/pdf', file, onSelect }: FileBoxProps) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.item(0) ?? null;
    onSelect(selected);
  };

  return (
    <Box
      sx={{
        border: 2,
        borderStyle: 'dashed',
        borderColor: 'divider',
        boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
        borderRadius: 2,
        p: 3,
        textAlign: 'center',
        bgcolor: 'background.paper',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Button
        component="label"
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        sx={{ mb: 1, textTransform: 'none' }}
      >
        {label}
        <input type="file" accept={acceptedTypes} hidden onChange={handleFileChange} />
      </Button>
      {description && (
        <Typography variant="caption" color="text.secondary" display="block">
          {description}
        </Typography>
      )}
      {file && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
            {file.name}
          </Typography>
          <Button
            size="small"
            variant="text"
            color="error"
            onClick={(e) => {
              e.preventDefault();
              onSelect(null);
            }}
            sx={{ mt: 0.5, textTransform: 'none' }}
          >
            Remove
          </Button>
        </Box>
      )}
    </Box>
  );
};

export const DocumentUploadStep = ({ value, onChange, onSubmit, onBack, isSubmitting = false }: DocumentUploadProps) => {
  const [state, setState] = useState<DocumentUploadState>(value ?? DEFAULT_STATE);

  useEffect(() => {
    setState(value ?? DEFAULT_STATE);
  }, [value]);

  const updateState = (partial: Partial<DocumentUploadState>) => {
    const updated = { ...state, ...partial };
    setState(updated);
    onChange(updated);
  };

  const handleSubmit = () => {
    onSubmit(state);
  };

  const canSubmit = Boolean(state.id_front) && Boolean(state.proof_of_address);

  return (
    <Box sx={{ maxWidth: 768, mx: 'auto' }}>
      <Stack spacing={4}>
        <Box sx={{ textAlign: 'center' }}>
          <SectionHeader
            variant="h4"
            subtitle="Upload high quality scans or photos of your identification documents."
          >
            Document Verification
          </SectionHeader>
        </Box>

        <Panel>
          <Stack spacing={3}>
            <Stack spacing={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Government ID Type</InputLabel>
                <Select
                  value={state.id_document_type}
                  onChange={(e) => updateState({ id_document_type: e.target.value as DocumentUploadState['id_document_type'] })}
                  label="Government ID Type"
                >
                  {ID_DOCUMENT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                <FileUploadBox
                  label="Front of ID"
                  description="JPEG, PNG or PDF up to 10MB"
                  file={state.id_front ?? null}
                  onSelect={(file) => updateState({ id_front: file })}
                />
                <FileUploadBox
                  label="Back of ID (if applicable)"
                  description="Required for two-sided IDs"
                  file={state.id_back ?? null}
                  onSelect={(file) => updateState({ id_back: file })}
                />
              </Box>

              <FileUploadBox
                label="Proof of Address"
                description="Recent utility bill, bank statement or official correspondence"
                file={state.proof_of_address ?? null}
                onSelect={(file) => updateState({ proof_of_address: file })}
              />
            </Stack>

            <Alert severity="success" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Security:</strong> Files are encrypted at rest and purged after verification. Typical review time is 24-48 hours.
              </Typography>
            </Alert>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
              <Button
                onClick={onBack}
                variant="text"
                sx={{ textTransform: 'none' }}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={!canSubmit || isSubmitting}
                aria-busy={isSubmitting || undefined}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Submit for Verification
              </Button>
            </Stack>
          </Stack>
        </Panel>
      </Stack>
    </Box>
  );
};
