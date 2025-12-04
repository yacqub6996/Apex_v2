import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import HistoryIcon from "@mui/icons-material/History";
import type { MaterialDashboardNavItem } from "@/components/layouts/material-dashboard";

/**
 * Centralized admin navigation configuration.
 * This ensures consistent navigation across all admin pages.
 * 
 * Navigation is organized by feature group:
 * 1. Overview - Main dashboard
 * 2. User Management - Users, KYC Review
 * 3. Trading Operations - Trader Manager, Balance Adjustment
 * 4. Investment Management - Long-Term Plans
 * 5. Audit & History - Ledger History
 * 6. Quick Access - User Dashboard link
 */
export const ADMIN_NAVIGATION: MaterialDashboardNavItem[] = [
  // Core - Overview
  { label: "Overview", to: "/admin/dashboard", icon: DashboardOutlinedIcon, exact: true },
  
  // User Management
  { label: "Users", to: "/admin/users", icon: PeopleAltOutlinedIcon },
  { label: "KYC Review", to: "/admin/kyc-review", icon: FactCheckOutlinedIcon },
  
  // Trading Operations
  { label: "Trader Manager", to: "/admin/trader-manager", icon: ManageAccountsOutlinedIcon },
  { label: "Balance Adjustment", to: "/admin/balance-adjustment", icon: PaymentsOutlinedIcon },
  
  // Investment Management
  { label: "Long-Term Plans", to: "/admin/long-term", icon: TrendingUpOutlinedIcon },
  
  // Audit & History
  { label: "Ledger History", to: "/admin/ledger-history", icon: HistoryIcon },
];

/**
 * Quick access link to switch to user view
 */
export const ADMIN_USER_DASHBOARD_LINK: MaterialDashboardNavItem = {
  label: "User Dashboard",
  to: "/dashboard",
  icon: DashboardOutlinedIcon,
};
