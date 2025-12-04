import type { ImgHTMLAttributes } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import { publicAsset } from "@/utils/public-asset";

const LOGO_SRC = publicAsset("images/Tech Trading Platform Logo - Apex, Wordmark Style (1).svg");

interface UntitledLogoMinimalProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'style'> {
    sx?: SxProps<Theme>;
}

export const UntitledLogoMinimal = ({ alt = "Apex Trades", sx, ...props }: UntitledLogoMinimalProps) => (
    <Box component="img" src={LOGO_SRC} alt={alt} sx={sx} {...props} />
);


