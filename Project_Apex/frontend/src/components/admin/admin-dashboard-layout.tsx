import type { ReactNode } from "react";
import { useMemo } from "react";
import { MaterialDashboardLayout } from "@/components/layouts/material-dashboard";
import { ADMIN_NAVIGATION, ADMIN_USER_DASHBOARD_LINK } from "@/constants/admin-navigation";
import { useAuth } from "@/providers/auth-provider";
import { toAbsoluteResource } from "@/utils/url";

export interface AdminDashboardLayoutProps {
  children?: ReactNode;
  /** Optional title override. Defaults to "Admin Dashboard" */
  title?: string;
  /** Optional subtitle override */
  subtitle?: string;
  /** Optional actions to display in the header */
  actions?: ReactNode;
  /** Optional global search component */
  globalSearch?: ReactNode;
}

// Pre-computed navigation array combining admin nav with user dashboard link
const FULL_ADMIN_NAVIGATION = [...ADMIN_NAVIGATION, ADMIN_USER_DASHBOARD_LINK];

/**
 * AdminDashboardLayout - Wrapper layout for all admin pages.
 * 
 * This component mirrors the UserDashboard pattern by providing:
 * - Consistent navigation across all admin pages
 * - User profile display with logout functionality
 * - Responsive sidebar with mobile drawer
 * - Theme-aware styling
 * 
 * Usage:
 * ```tsx
 * <AdminDashboardLayout title="KYC Review" subtitle="Review pending applications">
 *   <YourAdminContent />
 * </AdminDashboardLayout>
 * ```
 */
export const AdminDashboardLayout = ({
  children,
  title = "Admin Dashboard",
  subtitle = "Manage platform operations",
  actions,
  globalSearch,
}: AdminDashboardLayoutProps) => {
  const { user, logout } = useAuth();

  const userInfo = useMemo(() => {
    if (!user) return null;
    return {
      name: user.full_name ?? user.email ?? undefined,
      email: user.email ?? undefined,
      avatarUrl: toAbsoluteResource(user.profile_picture_url),
      role: user.role === 'admin' ? 'admin' : 'user',
    };
  }, [user]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  return (
    <MaterialDashboardLayout
      title={title}
      subtitle={subtitle}
      navigation={FULL_ADMIN_NAVIGATION}
      actions={actions}
      globalSearch={globalSearch}
      user={userInfo}
      onLogout={handleLogout}
    >
      {children}
    </MaterialDashboardLayout>
  );
};
