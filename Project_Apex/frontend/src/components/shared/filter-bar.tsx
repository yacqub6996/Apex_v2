import { type ReactNode } from "react";
import { Box, Stack, type SxProps, type Theme } from "@mui/material";

export interface FilterBarProps {
  /**
   * Filter controls to display
   */
  children: ReactNode;

  /**
   * Direction of the filter bar
   */
  direction?: "row" | "column";

  /**
   * Spacing between filter controls (theme spacing multiplier)
   */
  spacing?: number;

  /**
   * Alignment of items
   */
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";

  /**
   * Justify content
   */
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";

  /**
   * Whether to wrap items on small screens
   */
  wrap?: boolean;

  /**
   * Additional sx props
   */
  sx?: SxProps<Theme>;
}

/**
 * FilterBar - A reusable container for filter controls
 * 
 * This component provides consistent spacing and layout for filter controls
 * across the application. It automatically handles responsive wrapping.
 * 
 * Example usage:
 * ```tsx
 * <FilterBar spacing={2} justifyContent="space-between">
 *   <TextField select label="Status" value={status} onChange={handleStatus} />
 *   <TextField label="Search" value={search} onChange={handleSearch} />
 *   <DateRangePicker startDate={start} endDate={end} onChange={handleDates} />
 *   <Button variant="contained">Apply Filters</Button>
 * </FilterBar>
 * ```
 */
export const FilterBar = ({
  children,
  direction = "row",
  spacing = 2,
  alignItems = "center",
  justifyContent = "flex-start",
  wrap = true,
  sx,
}: FilterBarProps) => {
  return (
    <Box
      sx={{
        width: "100%",
        ...sx,
      }}
    >
      <Stack
        direction={direction}
        spacing={spacing}
        alignItems={alignItems}
        justifyContent={justifyContent}
        sx={{
          flexWrap: wrap ? "wrap" : "nowrap",
          gap: spacing,
        }}
      >
        {children}
      </Stack>
    </Box>
  );
};
