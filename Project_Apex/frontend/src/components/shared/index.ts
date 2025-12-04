/**
 * Shared Components Library
 * 
 * This module exports reusable UI components that follow Material UI best practices
 * and provide consistent styling across the application.
 */

export { MetricCard, type MetricCardProps } from "./metric-card";
export { DataTable, type DataTableProps, type DataTableColumn } from "./data-table";
export { FilterBar, type FilterBarProps } from "./filter-bar";
export { ActionsMenu, type ActionsMenuProps, type ActionMenuItem } from "./actions-menu";
export { Panel, type PanelProps } from "./panel";
export { PreferencesMenu } from "./preferences-menu";
export { SectionHeader, type SectionHeaderProps } from "./section-header";
export { Footer, type FooterProps } from "./footer";
export {
    FormSectionSkeleton,
    StatCardSkeleton,
    TableSkeleton,
} from "./loaders/skeletons";
