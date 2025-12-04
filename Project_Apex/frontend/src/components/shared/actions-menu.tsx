import { useState, type ReactNode, type MouseEvent } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  type SvgIconProps,
  type MenuProps,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import type { ComponentType } from "react";

export interface ActionMenuItem {
  /**
   * Unique identifier for the action
   */
  id: string;

  /**
   * Label to display
   */
  label: string;

  /**
   * Optional icon component
   */
  icon?: ComponentType<SvgIconProps>;

  /**
   * Click handler
   */
  onClick: () => void;

  /**
   * Whether this is a destructive action (e.g., delete)
   */
  destructive?: boolean;

  /**
   * Whether this action is disabled
   */
  disabled?: boolean;

  /**
   * Whether to show a divider after this item
   */
  divider?: boolean;
}

export interface ActionsMenuProps {
  /**
   * Array of action items
   */
  actions: ActionMenuItem[];

  /**
   * Optional custom trigger icon
   */
  icon?: ReactNode;

  /**
   * Optional aria-label for accessibility
   */
  ariaLabel?: string;

  /**
   * Size of the icon button
   */
  size?: "small" | "medium" | "large";

  /**
   * Whether the menu button is disabled
   */
  disabled?: boolean;

  /**
   * Optional Menu props to override defaults
   */
  menuProps?: Partial<MenuProps>;
}

/**
 * ActionsMenu - A reusable action menu component
 * 
 * This component provides a consistent way to display action menus (kebab/three-dot menus)
 * across the application. It handles all menu state and accessibility features.
 * Ensures 44px minimum touch target for menu items.
 * 
 * Example usage:
 * ```tsx
 * <ActionsMenu
 *   actions={[
 *     {
 *       id: 'edit',
 *       label: 'Edit',
 *       icon: EditIcon,
 *       onClick: handleEdit,
 *     },
 *     {
 *       id: 'delete',
 *       label: 'Delete',
 *       icon: DeleteIcon,
 *       onClick: handleDelete,
 *       destructive: true,
 *     },
 *   ]}
 *   ariaLabel="User actions"
 *   menuProps={{ slotProps: { paper: { sx: { minWidth: 200 } } } }}
 * />
 * ```
 */
export const ActionsMenu = ({
  actions,
  icon,
  ariaLabel = "Actions",
  size = "medium",
  disabled = false,
  menuProps,
}: ActionsMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation(); // Prevent row click if in a table
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action: ActionMenuItem) => {
    action.onClick();
    handleClose();
  };

  return (
    <>
      <IconButton
        aria-label={ariaLabel}
        aria-controls={open ? "actions-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        size={size}
        disabled={disabled}
        sx={{ 
          p: size === "small" ? 1 : 1.25,
          minWidth: 44,
          minHeight: 44,
        }}
      >
        {icon || <MoreVertIcon />}
      </IconButton>

      <Menu
        id="actions-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        {...menuProps}
        MenuListProps={{
          "aria-labelledby": "actions-button",
          // Explicitly set dense to false to ensure 44px minimum height for touch targets
          dense: false,
          ...menuProps?.MenuListProps,
        }}
      >
        {actions.map((action, index) => (
          <div key={action.id}>
            {/* dense={false} ensures we meet WCAG/Apple HIG 44px minimum touch target size. */}
            <MenuItem
              onClick={() => handleActionClick(action)}
              disabled={action.disabled}
              sx={{
                minHeight: 44,
                ...(action.destructive && {
                  color: "error.main",
                }),
              }}
            >
              {action.icon && (
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    ...(action.destructive && {
                      color: "error.main",
                    }),
                  }}
                >
                  <action.icon fontSize="small" />
                </ListItemIcon>
              )}
              <ListItemText
                primary={action.label}
                primaryTypographyProps={{
                  variant: "body2",
                }}
              />
            </MenuItem>
            {action.divider && index < actions.length - 1 && <Divider />}
          </div>
        ))}
      </Menu>
    </>
  );
};
