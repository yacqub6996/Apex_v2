import { useState } from "react";
import { Box, Button } from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { DepositModal } from "@/components/crypto/deposit/DepositModal";
import { WithdrawalModal } from "@/components/crypto/withdrawal/WithdrawalModal";
import { toast } from "react-toastify";

interface DashboardActionsProps {
    /** When false, only the Deposit action is rendered. */
    showWithdraw?: boolean;
}

/**
 * DashboardActions - Deposit and Withdraw buttons with dialog forms
 * 
 * This component provides the primary action buttons for the dashboard header,
 * allowing users to deposit funds into or withdraw funds from the platform.
 */
export const DashboardActions = ({ showWithdraw = true }: DashboardActionsProps) => {
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

    const handleDepositSuccess = () => {
        toast.success("Deposit submitted successfully.");
        setDepositModalOpen(false);
    };

    const handleWithdrawSuccess = () => {
        toast.success("Withdrawal request submitted successfully. Awaiting admin approval.");
    };

    return (
        <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
                variant="contained"
                size="small"
                startIcon={<ArrowDownwardIcon />}
                onClick={() => setDepositModalOpen(true)}
                sx={{
                    textTransform: "none",
                    fontWeight: 600,
                }}
            >
                Deposit
            </Button>
            {showWithdraw && (
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
            )}

            {/* Deposit Modal */}
            <DepositModal
                open={depositModalOpen}
                onClose={() => setDepositModalOpen(false)}
                onConfirmSuccess={handleDepositSuccess}
            />

            {/* Withdraw Modal */}
            {showWithdraw && (
                <WithdrawalModal
                    open={withdrawDialogOpen}
                    onClose={() => setWithdrawDialogOpen(false)}
                    onSuccess={handleWithdrawSuccess}
                    walletType="main"
                />
            )}
        </Box>
    );
};
