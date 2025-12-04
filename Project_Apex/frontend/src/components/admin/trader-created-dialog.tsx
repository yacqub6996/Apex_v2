import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { CheckCircle, ContentCopy } from "@mui/icons-material";
import { useClipboard } from "@/hooks/use-clipboard";

interface TraderCreatedDialogProps {
  traderCode: string;
  onCreateAnother: () => void;
}

export const TraderCreatedDialog = ({
  traderCode,
  onCreateAnother,
}: TraderCreatedDialogProps) => {
  const { copy } = useClipboard();

  const handleCopyCode = async () => {
    if (traderCode) {
      await copy(traderCode);
    }
  };

  return (
    <Box
      sx={{
        border: "none",
        boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
        borderRadius: 2,
        bgcolor: (theme) => theme.palette.success.light + "20",
        p: 3,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <CheckCircle color="success" />
        <Typography variant="h6" fontWeight={600} color="success.dark">
          Trader Created Successfully!
        </Typography>
      </Stack>

      <Stack spacing={2}>
        <Typography variant="body2" color="success.dark">
          The trader profile has been created successfully. Share the trader code with the user:
        </Typography>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            label={traderCode}
            color="success"
            size="medium"
            sx={{
              fontFamily: "monospace",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          />
          <Button
            size="small"
            onClick={handleCopyCode}
            variant="contained"
            color="success"
            startIcon={<ContentCopy fontSize="small" />}
          >
            Copy
          </Button>
        </Stack>

        <Typography variant="caption" color="success.dark">
          This code will be used for trader identification and copy trading operations.
        </Typography>

        <Button
          variant="outlined"
          color="success"
          onClick={onCreateAnother}
          sx={{ mt: 2 }}
        >
          Create Another Trader
        </Button>
      </Stack>
    </Box>
  );
};
