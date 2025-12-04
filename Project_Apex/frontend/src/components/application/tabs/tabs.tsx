import type { ComponentProps, ReactNode } from "react";
import { Fragment } from "react";
import {
  Tabs as MuiTabs,
  Tab as MuiTab,
  TabProps as MuiTabProps,
  TabsProps as MuiTabsProps,
  Box,
  styled,
} from "@mui/material";
import Chip from "@mui/material/Chip";

type Orientation = "horizontal" | "vertical";

// Types for different tab variants
type TabVariant = "button-brand" | "button-gray" | "button-border" | "button-minimal" | "underline" | "line";

// Custom props interface to avoid conflict with MUI's variant
interface CustomTabProps {
  customVariant?: TabVariant;
  size?: "sm" | "md";
  fullWidth?: boolean;
}

// Styled components for different tab variants
const StyledTab = styled(MuiTab, {
  shouldForwardProp: (prop) => !['customVariant', 'size', 'fullWidth'].includes(prop as string),
})<CustomTabProps>(({ theme, customVariant = "button-brand", size = "sm", fullWidth }) => {
  const baseStyles = {
    minHeight: 'auto',
    padding: size === "sm" ? theme.spacing(1, 1.5) : theme.spacing(1.25, 1.5),
    fontSize: size === "sm" ? theme.typography.pxToRem(14) : theme.typography.pxToRem(16),
    fontWeight: theme.typography.fontWeightMedium,
    textTransform: 'none' as const,
    borderRadius: theme.spacing(0.5),
    transition: theme.transitions.create(['background-color', 'color', 'border-color'], {
      duration: theme.transitions.duration.short,
    }),
    gap: theme.spacing(0.5),
    ...(fullWidth && { flex: 1 }),
  };

  switch (customVariant) {
    case "button-brand":
      return {
        ...baseStyles,
        '&.Mui-selected': {
          backgroundColor: theme.palette.primary.light,
          color: theme.palette.primary.contrastText,
        },
        '&:hover': {
          backgroundColor: theme.palette.primary.light,
          color: theme.palette.primary.contrastText,
        },
      };
    
    case "button-gray":
      return {
        ...baseStyles,
        '&.Mui-selected': {
          backgroundColor: theme.palette.action.selected,
          color: theme.palette.text.secondary,
        },
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
          color: theme.palette.text.secondary,
        },
      };
    
    case "button-border":
      return {
        ...baseStyles,
        '&.Mui-selected': {
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          boxShadow: theme.shadows[1],
        },
        '&:hover': {
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          boxShadow: theme.shadows[1],
        },
      };
    
    case "button-minimal":
      return {
        ...baseStyles,
        borderRadius: theme.spacing(1),
        '&.Mui-selected': {
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          boxShadow: theme.shadows[1],
          border: `1px solid ${theme.palette.divider}`,
        },
        '&:hover': {
          color: theme.palette.text.secondary,
        },
      };
    
    case "underline":
      return {
        ...baseStyles,
        borderRadius: 0,
        padding: size === "sm" ? theme.spacing(0, 0.5, 1.25, 0.5) : theme.spacing(0, 0.5, 1.25, 0.5),
        minHeight: 'auto',
        '&.Mui-selected': {
          color: theme.palette.primary.main,
          borderBottom: `2px solid ${theme.palette.primary.main}`,
        },
        '&:hover': {
          color: theme.palette.primary.main,
          borderBottom: `2px solid ${theme.palette.primary.main}`,
        },
      };
    
    case "line":
      return {
        ...baseStyles,
        borderRadius: 0,
        padding: size === "sm" ? theme.spacing(0.5, 1.5, 0.5, 1) : theme.spacing(1, 2, 1, 1.5),
        minHeight: 'auto',
        '&.Mui-selected': {
          color: theme.palette.primary.main,
          borderLeft: `2px solid ${theme.palette.primary.main}`,
        },
        '&:hover': {
          color: theme.palette.primary.main,
          borderLeft: `2px solid ${theme.palette.primary.main}`,
        },
      };
    
    default:
      return baseStyles;
  }
});

const StyledTabs = styled(MuiTabs, {
  shouldForwardProp: (prop) => !['customVariant', 'fullWidth'].includes(prop as string),
})<{ customVariant?: TabVariant; fullWidth?: boolean }>(({ theme, customVariant = "button-brand", fullWidth }) => {
  const baseStyles = {
    minHeight: 'auto',
  };

  switch (customVariant) {
    case "button-border":
      return {
        ...baseStyles,
        backgroundColor: theme.palette.action.hover,
        borderRadius: theme.spacing(1.25),
        padding: theme.spacing(0.5),
        gap: theme.spacing(0.5),
        border: `1px solid ${theme.palette.divider}`,
        ...(fullWidth && { width: '100%' }),
      };
    
    case "button-minimal":
      return {
        ...baseStyles,
        backgroundColor: theme.palette.action.hover,
        borderRadius: theme.spacing(1),
        padding: theme.spacing(0.25),
        gap: theme.spacing(0.25),
        border: `1px solid ${theme.palette.divider}`,
        ...(fullWidth && { width: '100%' }),
      };
    
    case "underline":
      return {
        ...baseStyles,
        gap: theme.spacing(3),
        position: 'relative' as const,
        '&::before': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: theme.palette.divider,
        },
        ...(fullWidth && { 
          width: '100%',
          gap: theme.spacing(4),
        }),
      };
    
    default:
      return {
        ...baseStyles,
        gap: theme.spacing(0.5),
        ...(fullWidth && { width: '100%' }),
      };
  }
});

// Tab component props
interface TabComponentProps extends Omit<MuiTabProps, 'children'>, CustomTabProps {
  /** The label of the tab */
  label?: ReactNode;
  /** The children of the tab */
  children?: ReactNode;
  /** The badge displayed next to the label */
  badge?: number | string;
}

// TabList component props
interface TabListComponentProps extends Omit<MuiTabsProps, 'children'>, CustomTabProps {
  /** The orientation of the tab list */
  orientation?: Orientation;
  /** The children of the tab list */
  children: ReactNode;
}

// Tab component
export const Tab = ({ label, children, badge, size = "sm", customVariant = "button-brand", fullWidth, ...otherProps }: TabComponentProps) => {
  const chipColor = customVariant === "button-brand" || customVariant === "underline" || customVariant === "line" ? "primary" : "default";
  
  const renderLabel = () => (
    <Fragment>
      {children || label}
      {badge && (
        <Chip
          label={badge}
          size={size === "sm" ? "small" : "medium"}
          color={chipColor}
          sx={{
            display: { xs: 'none', md: 'inline-flex' },
            marginTop: size === "sm" ? '-4px' : '0',
            marginBottom: size === "sm" ? '-4px' : '0'
          }}
        />
      )}
    </Fragment>
  );

  return (
    <StyledTab
      label={renderLabel()}
      size={size}
      customVariant={customVariant}
      fullWidth={fullWidth}
      {...otherProps}
    />
  );
};

// TabList component
export const TabList = ({
  size = "sm",
  customVariant = "button-brand",
  orientation = "horizontal",
  fullWidth,
  children,
  ...otherProps
}: TabListComponentProps) => {
  return (
    <StyledTabs
      customVariant={customVariant}
      orientation={orientation}
      fullWidth={fullWidth}
      {...otherProps}
    >
      {children}
    </StyledTabs>
  );
};

// TabPanel component
export const TabPanel = ({ children, value, index, ...otherProps }: { children: ReactNode; value: number; index: number } & ComponentProps<typeof Box>) => {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...otherProps}
      sx={{
        p: 2,
        ...otherProps.sx,
      }}
    >
      {value === index && children}
    </Box>
  );
};

// Main Tabs component
interface TabsComponentProps extends Omit<MuiTabsProps, 'children'> {
  /** The children of the tabs component */
  children: ReactNode;
  /** The value of the currently selected tab */
  value: number;
  /** Callback fired when the tab value changes */
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

export const Tabs = ({ children, value, onChange, ...otherProps }: TabsComponentProps) => {
  return (
    <MuiTabs
      value={value}
      onChange={onChange}
      {...otherProps}
    >
      {children}
    </MuiTabs>
  );
};

// Compound component pattern for backward compatibility
Tabs.Panel = TabPanel;
Tabs.List = TabList;
Tabs.Item = Tab;
