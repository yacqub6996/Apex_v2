import { type ReactNode } from "react";
import { alpha } from "@mui/material/styles";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Paper,
  Skeleton,
} from "@mui/material";

export interface DataTableColumn<T = any> {
  /**
   * Unique identifier for the column
   */
  id: string;

  /**
   * Column header label
   */
  label: string;

  /**
   * Function to get the value from the row data
   */
  accessor: (row: T) => ReactNode;

  /**
   * Optional custom cell renderer
   */
  render?: (row: T, value: ReactNode) => ReactNode;

  /**
   * Whether this column is sortable
   */
  sortable?: boolean;

  /**
   * Alignment for the column content
   */
  align?: "left" | "center" | "right";

  /**
   * Width of the column (CSS value)
   */
  width?: string | number;

  /**
   * Hide column on mobile (mobileStack mode)
   */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T = any> {
  /**
   * Array of column definitions
   */
  columns: DataTableColumn<T>[];

  /**
   * Array of data rows
   */
  rows: T[];

  /**
   * Optional function to get unique key for each row
   */
  getRowKey?: (row: T, index: number) => string | number;

  /**
   * Message to display when no data is available
   */
  emptyMessage?: string;

  /**
   * Optional sort configuration
   */
  sortConfig?: {
    column: string;
    direction: "asc" | "desc";
  };

  /**
   * Optional handler for sort changes
   */
  onSort?: (column: string) => void;

  /**
   * Whether to show striped rows
   */
  striped?: boolean;

  /**
   * Maximum height for the table (enables scrolling)
   */
  maxHeight?: string | number;

  /**
   * Whether data is loading (shows skeleton rows)
   */
  isLoading?: boolean;

  /**
   * Number of skeleton rows to show when loading
   */
  skeletonRowCount?: number;

  /**
   * Use dense table padding
   */
  dense?: boolean;

  /**
   * Enable mobile stacking mode (stacks cells vertically on small screens)
   */
  mobileStack?: boolean;

  /**
   * Optional row ID to highlight with success animation
   */
  highlightedRowId?: string | number | null;
}

/**
 * DataTable - A reusable table component with consistent styling
 * 
 * This component provides a standardized way to display tabular data across the application.
 * It supports sorting, custom rendering, responsive scrolling, loading states, and mobile stacking.
 * 
 * Example usage:
 * ```tsx
 * <DataTable
 *   columns={[
 *     { id: 'name', label: 'Name', accessor: (row) => row.name },
 *     { id: 'email', label: 'Email', accessor: (row) => row.email },
 *     { id: 'status', label: 'Status', accessor: (row) => row.status, align: 'center' },
 *   ]}
 *   rows={users}
 *   getRowKey={(row) => row.id}
 *   isLoading={loading}
 *   mobileStack={true}
 * />
 * ```
 */
export const DataTable = <T,>({
  columns,
  rows,
  getRowKey = (_, index) => index,
  emptyMessage = "No data available",
  sortConfig,
  onSort,
  striped = false,
  maxHeight,
  isLoading = false,
  skeletonRowCount = 5,
  dense = false,
  mobileStack = false,
  highlightedRowId = null,
}: DataTableProps<T>) => {
  const handleSort = (columnId: string) => {
    if (onSort) {
      onSort(columnId);
    }
  };

  const visibleColumns = mobileStack
    ? columns.filter(col => !col.hideOnMobile)
    : columns;

  // Helper to determine column display based on mobile stack and hide settings
  const getColumnDisplay = (column: DataTableColumn<T>) => ({
    xs: mobileStack && column.hideOnMobile ? 'none' : 'table-cell',
    sm: 'table-cell'
  });

  const tableContainerSx = {
    maxWidth: "100%",
    overflowX: "auto",
    ...(maxHeight !== undefined && { maxHeight }),
    borderRadius: 2,
    border: "none",
    boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
    ...(mobileStack && {
      '@media (max-width: 599px)': {
        overflowX: 'visible',
        '& .MuiTable-root': {
          display: 'block',
        },
        // Hide table header on small screens so only card rows remain
        '& .MuiTableHead-root': {
          display: 'none',
        },
        // Stack body rows into card-like blocks
        '& .MuiTableBody-root .MuiTableRow-root': {
          display: 'flex',
          flexDirection: 'column',
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: 2,
          p: 2,
        },
        // Show labels for body cells only
        '& .MuiTableBody-root .MuiTableCell-root': {
          display: 'block',
          border: 'none',
          py: 1,
          '&::before': {
            content: 'attr(data-label)',
            fontWeight: 600,
            display: 'inline-block',
            width: '120px',
            color: 'text.secondary',
          },
        },
      },
    }),
  };

  return (
    <TableContainer
      component={Paper}
      variant="elevation"
      sx={tableContainerSx}
    >
      <Table 
        stickyHeader={Boolean(maxHeight)} 
        size={dense ? "small" : "medium"}
        aria-label="data table"
      >
        <TableHead
        sx={(theme) => ({
          backgroundColor: theme.palette.primary.main,
          "& .MuiTableCell-head": {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.common.white,
            fontWeight: 700,
            borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.16)}`
          },
          "& .MuiTableSortLabel-root": {
            color: `${alpha(theme.palette.common.white, 0.95)} !important`,
            "& .MuiTableSortLabel-icon": {
              color: `${alpha(theme.palette.common.white, 0.95)} !important`,
            },
          },
        })}
      >
          <TableRow>
            {visibleColumns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align || "left"}
                data-label={column.label}
                sx={{
                  fontWeight: 700,
                  width: column.width,
                  display: getColumnDisplay(column),
                }}
              >
                {onSort && column.sortable ? (
                  <TableSortLabel
                    active={sortConfig?.column === column.id}
                    direction={
                      sortConfig?.column === column.id ? sortConfig.direction : "asc"
                    }
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            // Render skeleton rows while loading
            Array.from({ length: skeletonRowCount }).map((_, skeletonIndex) => (
              <TableRow key={`skeleton-${skeletonIndex}`}>
                {visibleColumns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align || "left"}
                    data-label={column.label}
                    sx={{
                      display: getColumnDisplay(column),
                    }}
                  >
                    <Skeleton variant="text" width="80%" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} align="center" sx={{ py: 8 }}>
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => {
              const rowKey = getRowKey(row, index);
              const isHighlighted = highlightedRowId !== null && highlightedRowId === rowKey;
              return (
                <TableRow
                  key={rowKey}
                  hover
                  className={isHighlighted ? "row-highlight" : ""}
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    ...(striped &&
                      index % 2 === 1 && {
                        bgcolor: "action.hover",
                      }),
                  }}
                >
                  {visibleColumns.map((column) => {
                    const value = column.accessor(row);
                    const content = column.render
                      ? column.render(row, value)
                      : value;

                    return (
                      <TableCell
                        key={column.id}
                        align={column.align || "left"}
                        data-label={column.label}
                        sx={{
                          display: getColumnDisplay(column),
                        }}
                      >
                        {content}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

