import { ChangeEvent } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import type { UserPublic } from "@/api/models/UserPublic";

const specialtyOptions = [
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "stocks", label: "Stocks" },
  { value: "indices", label: "Indices" },
];

const riskLevelOptions = [
  { value: "LOW", label: "Low Risk" },
  { value: "MEDIUM", label: "Medium Risk" },
  { value: "HIGH", label: "High Risk" },
];

export interface TraderFormData {
  userId: string;
  displayName: string;
  specialty: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  isPublic: boolean;
  copyFeePercentage: number;
  minimumCopyAmount: number;
  totalCopiers: number;
  totalAssetsUnderCopy: number;
  averageMonthlyReturn: number;
}

interface TraderCreationFormProps {
  formData: TraderFormData;
  users: UserPublic[];
  existingTraderUserIds: Set<string>;
  isSubmitting: boolean;
  onInputChange: (field: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const TraderCreationForm = ({
  formData,
  users,
  existingTraderUserIds,
  isSubmitting,
  onInputChange,
  onSubmit,
}: TraderCreationFormProps) => {
  const handleSelectChange = (field: string) => (e: SelectChangeEvent) => {
    onInputChange(field, e.target.value);
  };

  const handleTextChange = (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    onInputChange(field, e.target.value);
  };

  const handleNumberChange = (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    onInputChange(field, parseFloat(e.target.value) || 0);
  };

  const handleCheckboxChange = (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    onInputChange(field, e.target.checked);
  };

  return (
    <Box component="form" onSubmit={onSubmit}>
      <Stack spacing={3}>
        {/* User Selection */}
        <FormControl fullWidth required>
          <InputLabel id="user-select-label">Select User</InputLabel>
          <Select
            labelId="user-select-label"
            label="Select User"
            value={formData.userId}
            onChange={handleSelectChange("userId")}
            disabled={isSubmitting}
          >
            <MenuItem value="">
              <em>Select a user</em>
            </MenuItem>
            {users.map((user: UserPublic) => {
              const alreadyTrader = existingTraderUserIds.has(user.id);
              return (
                <MenuItem key={user.id} value={user.id} disabled={alreadyTrader}>
                  {`${user.email} (${user.full_name || "No name"})${alreadyTrader ? " — already a trader" : ""}`}
                </MenuItem>
              );
            })}
          </Select>
          {formData.userId && existingTraderUserIds.has(formData.userId) && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
              Selected user already has a trader profile.
            </Typography>
          )}
        </FormControl>

        {/* Display Name */}
        <TextField
          label="Display Name"
          value={formData.displayName}
          onChange={handleTextChange("displayName")}
          placeholder="Enter trader display name"
          disabled={isSubmitting}
          required
          fullWidth
        />

        {/* Specialty */}
        <FormControl fullWidth required>
          <InputLabel id="specialty-label">Specialty</InputLabel>
          <Select
            labelId="specialty-label"
            label="Specialty"
            value={formData.specialty}
            onChange={handleSelectChange("specialty")}
            disabled={isSubmitting}
          >
            <MenuItem value="">
              <em>Select specialty</em>
            </MenuItem>
            {specialtyOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Risk Level */}
        <FormControl fullWidth required>
          <InputLabel id="risk-level-label">Risk Level</InputLabel>
          <Select
            labelId="risk-level-label"
            label="Risk Level"
            value={formData.riskLevel}
            onChange={handleSelectChange("riskLevel")}
            disabled={isSubmitting}
          >
            {riskLevelOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Public Trader Checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.isPublic}
              onChange={handleCheckboxChange("isPublic")}
              disabled={isSubmitting}
            />
          }
          label="Make this trader public for copy trading"
        />

        {/* Copy Fee and Minimum Amount */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Copy Fee (%)"
              type="number"
              value={formData.copyFeePercentage}
              onChange={handleNumberChange("copyFeePercentage")}
              disabled={isSubmitting}
              fullWidth
              inputProps={{ step: 0.1, min: 0, max: 100 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Minimum Copy Amount ($)"
              type="number"
              value={formData.minimumCopyAmount}
              onChange={handleNumberChange("minimumCopyAmount")}
              disabled={isSubmitting}
              fullWidth
              inputProps={{ step: 10, min: 0 }}
            />
          </Grid>
        </Grid>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          fullWidth
        >
          {isSubmitting ? "Creating Trader..." : "Create Trader Profile"}
        </Button>
      </Stack>
    </Box>
  );
};
