import { SvgIcon, type SvgIconProps } from "@mui/material";

export function AppIcon(props: SvgIconProps) {
  return (
    <SvgIcon
      {...props}
      sx={{ width: 20, height: 20, ...props.sx }}
      viewBox="0 0 20 20"
    >
      <rect x="2" y="2" width="6" height="6" rx="2" />
      <rect x="2" y="10" width="6" height="6" rx="2" />
      <rect x="10" y="6" width="6" height="6" rx="2" />
    </SvgIcon>
  );
}
