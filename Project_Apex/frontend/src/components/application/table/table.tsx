import type { ComponentPropsWithRef, HTMLAttributes, ReactNode, Ref } from "react";
import { createContext, isValidElement, useContext } from "react";
import { ContentCopy, Edit, Help, Delete } from "@mui/icons-material";
import {
    Table as MuiTable,
    TableBody as MuiTableBody,
    TableCell as MuiTableCell,
    type TableCellProps as MuiTableCellProps,
    TableContainer as MuiTableContainer,
    TableHead as MuiTableHead,
    TableRow as MuiTableRow,
    Box,
    Paper,
    Typography,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import Chip from "@mui/material/Chip";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";

export const TableRowActionsDropdown = () => (
    <Dropdown.Root>
        <Dropdown.DotsButton />

        <Dropdown.Popover className="w-min">
            <Dropdown.Menu>
                <Dropdown.Item icon={Edit}>
                    <span className="pr-4">Edit</span>
                </Dropdown.Item>
                <Dropdown.Item icon={ContentCopy}>
                    <span className="pr-4">Copy link</span>
                </Dropdown.Item>
                <Dropdown.Item icon={Delete}>
                    <span className="pr-4">Delete</span>
                </Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown.Popover>
    </Dropdown.Root>
);

const TableContext = createContext<{ size: "sm" | "md" }>({ size: "md" });

const TableCardRoot = ({ children, className, size = "md", ...props }: HTMLAttributes<HTMLDivElement> & { size?: "sm" | "md" }) => {
    const theme = useTheme();
    return (
        <TableContext.Provider value={{ size }}>
            <Paper
                {...props}
                elevation={1}
                sx={{
                    overflow: 'hidden',
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                    border: `1px solid ${theme.palette.divider}`,
                }}
                className={className}
            >
                {children}
            </Paper>
        </TableContext.Provider>
    );
};

interface TableCardHeaderProps {
    /** The title of the table card header. */
    title: string;
    /** The badge displayed next to the title. */
    badge?: ReactNode;
    /** The description of the table card header. */
    description?: string;
    /** The content displayed after the title and badge. */
    contentTrailing?: ReactNode;
    /** The class name of the table card header. */
    className?: string;
}

const TableCardHeader = ({ title, badge, description, contentTrailing, className }: TableCardHeaderProps) => {
    const { size } = useContext(TableContext);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'flex-start',
                gap: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                backgroundColor: 'background.paper',
                px: isMobile ? 2 : size === 'sm' ? 2.5 : 3,
                py: size === 'sm' ? 2 : 2.5,
            }}
            className={className}
        >
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                        variant={size === "sm" ? "h6" : "h5"}
                        sx={{ fontWeight: 600, color: 'text.primary' }}
                    >
                        {title}
                    </Typography>
                    {badge ? (
                        isValidElement(badge) ? (
                            badge
                        ) : (
                            <Chip label={badge} color="primary" size="small" />
                        )
                    ) : null}
                </Box>
                {description && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {description}
                    </Typography>
                )}
            </Box>
            {contentTrailing}
        </Box>
    );
};

interface TableRootProps extends Omit<ComponentPropsWithRef<"table">, "className" | "slot" | "style"> {
    size?: "sm" | "md";
    className?: string;
}

const TableRoot = ({ className, size = "md", ...props }: TableRootProps) => {
    const context = useContext(TableContext);

    return (
        <TableContext.Provider value={{ size: context?.size ?? size }}>
            <MuiTableContainer sx={{ overflowX: 'auto' }}>
                <MuiTable className={cx("w-full overflow-x-hidden", className)} {...props} />
            </MuiTableContainer>
        </TableContext.Provider>
    );
};
TableRoot.displayName = "Table";

interface TableHeaderProps
    extends Omit<ComponentPropsWithRef<"thead">, "children" | "className" | "slot" | "style"> {
    bordered?: boolean;
    children?: ReactNode;
    className?: string;
}

const TableHeader = ({ children, bordered = true, className, ...props }: TableHeaderProps) => {
    const { size } = useContext(TableContext);
    const theme = useTheme();

    return (
        <MuiTableHead
            {...props}
            sx={{
                position: 'relative',
                backgroundColor: 'action.hover',
                height: size === "sm" ? 36 : 44,
                ...(bordered && {
                    '& .MuiTableCell-root': {
                        position: 'relative',
                        '&::after': {
                            content: '""',
                            pointerEvents: 'none',
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: '1px',
                            backgroundColor: theme.palette.divider,
                        },
                        '&:focus-visible::after': {
                            backgroundColor: 'transparent',
                        },
                    },
                }),
            }}
            className={className}
        >
            {children}
        </MuiTableHead>
    );
};

TableHeader.displayName = "TableHeader";

interface TableHeadProps extends Omit<MuiTableCellProps, "children" | "className"> {
    label?: string;
    tooltip?: string;
    children?: ReactNode;
    className?: string;
}

const TableHead = ({ className, tooltip, label, children, ...props }: TableHeadProps) => {
    const theme = useTheme();
    
    return (
        <MuiTableCell
            {...props}
            sx={{
                position: 'relative',
                padding: 0,
                paddingLeft: 3,
                paddingRight: 3,
                paddingTop: 1,
                paddingBottom: 1,
                outline: 'none',
                '&:focus-visible': {
                    zIndex: 1,
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: -2,
                },
            }}
            className={className}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {label && (
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                color: 'text.disabled',
                                fontSize: '0.75rem',
                            }}
                        >
                            {label}
                        </Typography>
                    )}
                    {children}
                </Box>

                {tooltip && (
                    <Tooltip title={tooltip} placement="top">
                        <Box
                            component="span"
                            sx={{
                                cursor: 'pointer',
                                color: 'text.disabled',
                                transition: 'color 100ms ease-linear',
                                display: 'inline-flex',
                                alignItems: 'center',
                                '&:hover, &:focus': {
                                    color: 'text.secondary',
                                },
                            }}
                        >
                            <Help sx={{ fontSize: 16 }} />
                        </Box>
                    </Tooltip>
                )}
            </Box>
        </MuiTableCell>
    );
};
TableHead.displayName = "TableHead";

interface TableRowProps
    extends Omit<ComponentPropsWithRef<"tr">, "children" | "className" | "onClick" | "slot" | "style" | "id"> {
    highlightSelectedRow?: boolean;
    children?: ReactNode;
    className?: string;
}

const TableRow = ({ children, className, highlightSelectedRow = true, ...props }: TableRowProps) => {
    const { size } = useContext(TableContext);
    const theme = useTheme();

    return (
        <MuiTableRow
            {...props}
            sx={{
                position: 'relative',
                outline: 'none',
                transition: 'background-color 0.2s ease-in-out',
                height: size === "sm" ? 56 : 72,
                '&:hover': {
                    backgroundColor: 'action.hover',
                },
                '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: -2,
                },
                ...(highlightSelectedRow && {
                    '&.Mui-selected': {
                        backgroundColor: 'action.hover',
                    },
                }),
                '& .MuiTableCell-root': {
                    position: 'relative',
                    '&::after': {
                        content: '""',
                        pointerEvents: 'none',
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: '1px',
                        width: '100%',
                        backgroundColor: theme.palette.divider,
                    },
                    '&:last-child::after': {
                        display: 'none',
                    },
                    '&:focus-visible::after': {
                        opacity: 0,
                    },
                },
            }}
            className={className}
        >
            {children}
        </MuiTableRow>
    );
};

TableRow.displayName = "TableRow";

interface TableCellProps extends Omit<MuiTableCellProps, "children" | "className"> {
    ref?: Ref<HTMLTableCellElement>;
    children?: ReactNode;
    className?: string;
}

const TableCell = ({ className, children, ...props }: TableCellProps) => {
    const { size } = useContext(TableContext);
    const theme = useTheme();

    return (
        <MuiTableCell
            {...props}
            sx={{
                position: 'relative',
                fontSize: '0.875rem',
                color: 'text.secondary',
                outline: 'none',
                paddingLeft: size === "sm" ? 2.5 : 3,
                paddingRight: size === "sm" ? 2.5 : 3,
                paddingTop: size === "sm" ? 1.5 : 2,
                paddingBottom: size === "sm" ? 1.5 : 2,
                '&:focus-visible': {
                    zIndex: 1,
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: -2,
                },
            }}
            className={className}
        >
            {children}
        </MuiTableCell>
    );
};
TableCell.displayName = "TableCell";

const TableCard = {
    Root: TableCardRoot,
    Header: TableCardHeader,
};

const Table = TableRoot as typeof TableRoot & {
    Body: typeof MuiTableBody;
    Cell: typeof TableCell;
    Head: typeof TableHead;
    Header: typeof TableHeader;
    Row: typeof TableRow;
};
Table.Body = MuiTableBody;
Table.Cell = TableCell;
Table.Head = TableHead;
Table.Header = TableHeader;
Table.Row = TableRow;

export { Table, TableCard };

