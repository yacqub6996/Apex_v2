import type { FC, ReactNode } from "react";
import { Avatar, Box, Typography } from "@mui/material";
import { cx } from "@/utils/cx";

const styles = {
  sm: { root: "gap-2", title: "text-sm font-semibold", subtitle: "text-xs" },
  md: { root: "gap-2", title: "text-sm font-semibold", subtitle: "text-sm" },
  lg: { root: "gap-3", title: "text-md font-semibold", subtitle: "text-md" },
  xl: { root: "gap-4", title: "text-lg font-semibold", subtitle: "text-md" },
};

interface AvatarLabelGroupProps {
  size: "sm" | "md" | "lg" | "xl";
  title: string | ReactNode;
  subtitle: string | ReactNode;
  src?: string;
  alt?: string;
  status?: "online" | "offline";
  className?: string;
}

const sizeMap = {
  sm: { width: 32, height: 32 },
  md: { width: 40, height: 40 },
  lg: { width: 56, height: 56 },
  xl: { width: 80, height: 80 },
};

export const AvatarLabelGroup: FC<AvatarLabelGroupProps> = ({
  title,
  subtitle,
  src,
  alt,
  className,
  size = "md"
}) => {
  return (
    <Box className={cx("group flex min-w-0 flex-1 items-center", styles[size].root, className)}>
      <Avatar
        src={src}
        alt={alt}
        sx={sizeMap[size]}
      />
      <Box className="min-w-0 flex-1">
        <Typography 
          variant="body2" 
          className={cx("text-primary", styles[size].title)}
          sx={{ fontWeight: 600 }}
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          className={cx("truncate text-tertiary", styles[size].subtitle)}
          sx={{ 
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
};