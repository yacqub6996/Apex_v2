import { useState } from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { DepositRequest } from "@/components/dashboard/deposit-request";
import { WithdrawalModal } from "@/components/crypto/withdrawal/WithdrawalModal";
import { toast } from "react-toastify";

/**
 * DashboardActions - Deposit and Withdraw buttons with dialog forms
 * 
 * This component provides the primary action buttons for the dashboard header,
 * allowing users to deposit funds into or withdraw funds from the platform.
 */
export const DashboardActions = () => {
    const [depositDialogOpen, setDepositDialogOpen] = useState(false);
    const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

    const handleDepositSuccess = () => {
        toast.success("Deposit request submitted successfully. Awaiting admin approval.");
        setDepositDialogOpen(false);
    };

    const handleDepositError = (error: Error) => {
        toast.error(error.message || "Failed to submit deposit request");
    };

    const handleWithdrawSuccess = () => {
        toast.success("Withdrawal request submitted successfully. Awaiting admin approval.");
        setWithdrawDialogOpen(false);
    };

    return (
        <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
                variant="contained"
                size="small"
                startIcon={<ArrowDownwardIcon />}
                onClick={() => setDepositDialogOpen(true)}
                sx={{
                    textTransform: "none",
                    fontWeight: 600,
                }}
            >
                Deposit
            </Button>
            <Button
                variant="outlined"
                size="small"
                startIcon={<ArrowUpwardIcon />}
                onClick={() => setWithdrawDialogOpen(true)}
                sx={{
                    textTransform: "none",
                    fontWeight: 600,
                }}
            >
                Withdraw
            </Button>

            {/* Deposit Dialog */}
            <Dialog
                open={depositDialogOpen}
                onClose={() => setDepositDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        Deposit Funds
                        <IconButton
                            edge="end"
                            onClick={() => setDepositDialogOpen(false)}
                            aria-label="close"
                            size="small"
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DepositRequest
                        onSuccess={handleDepositSuccess}
                        onError={handleDepositError}
                    />
                </DialogContent>
            </Dialog>

            {/* Withdraw Modal */}
            <WithdrawalModal
                open={withdrawDialogOpen}
                onClose={() => {
                    setWithdrawDialogOpen(false);
                    handleWithdrawSuccess();
                }}
                walletType="main"
            />
        </Box>
    );
};
