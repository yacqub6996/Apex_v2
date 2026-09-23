/**
 * MobileNotificationSheet — bottom-anchored MUI Drawer surface for the
 * notification center on viewports below 600px (F-07/F-08/F-15/F-22).
 *
 * The Drawer provides the scrim, focus trap, and focus restoration; the paper
 * follows the Apex bottom-sheet visual language (24px top radius, drag handle,
 * fixed header/footer, single scrolling list region).
 */
import type { ReactNode } from "react";
import { Drawer } from "@mui/material";

export interface MobileNotificationSheetProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
}

export const MobileNotificationSheet = ({
    open,
    onClose,
    children,
}: MobileNotificationSheetProps) => {
    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            ModalProps={{
                "aria-labelledby": "notification-center-title",
            }}
            PaperProps={{
                id: "notification-mobile-sheet",
                sx: {
                    width: "100%",
                    maxWidth: "100%",
                    borderRadius: "24px 24px 0 0",
                    height: "min(88dvh, calc(100dvh - env(safe-area-inset-top, 0px)))",
                    maxHeight: "90dvh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    bgcolor: "background.paper",
                },
            }}
        >
            {children}
        </Drawer>
    );
};
