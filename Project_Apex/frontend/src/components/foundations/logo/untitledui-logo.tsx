import type { ImgHTMLAttributes } from "react";
import type { SxProps, Theme } from "@mui/material";

import { UntitledLogoMinimal } from "./untitledui-logo-minimal";

interface UntitledLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'style'> {
    sx?: SxProps<Theme>;
}

export const UntitledLogo = ({ alt = "Apex Trades", sx, ...props }: UntitledLogoProps) => (
    <UntitledLogoMinimal alt={alt} sx={sx} {...props} />
);

