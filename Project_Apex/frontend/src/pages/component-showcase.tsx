import { useState } from "react";
import { Box, Button, TextField, Stack, Typography, Select, MenuItem, FormControl, InputLabel, Chip, AppBar, Toolbar } from "@mui/material";
import {
  MetricCard,
  DataTable,
  FilterBar,
  ActionsMenu,
  Panel,
  SectionHeader,
  PreferencesMenu,
  type DataTableColumn,
  type ActionMenuItem,
} from "@/components/shared";
import { useDashboardStore } from "@/stores/dashboard-store";
import { formatCurrencyByPreference } from "@/utils/currency";
import PeopleIcon from "@mui/icons-material/People";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";

interface DemoUser {
  id: string;
  name: string;
  email: string;
  status: string;
  balance: number;
}

const mockUsers: DemoUser[] = [
  { id: "1", name: "John Doe", email: "john@example.com", status: "Active", balance: 1250.50 },
  { id: "2", name: "Jane Smith", email: "jane@example.com", status: "Active", balance: 3420.75 },
  { id: "3", name: "Bob Johnson", email: "bob@example.com", status: "Inactive", balance: 890.25 },
  { id: "4", name: "Alice Williams", email: "alice@example.com", status: "Active", balance: 5670.00 },
];

/**
 * ComponentShowcase - Demonstration page for all shared components
 * 
 * This page showcases all the reusable components created as part of the MUI audit refactor.
 * It serves as both documentation and a visual test for component functionality.
 */
export const ComponentShowcase = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Get preferences from store
  const preferredCurrency = useDashboardStore((s) => s.preferredCurrency);
  const useCompactLayout = useDashboardStore((s) => s.useCompactLayout);

  // Data table columns configuration
  const columns: DataTableColumn<DemoUser>[] = [
    {
      id: "name",
      label: "Name",
      accessor: (row) => row.name,
      sortable: true,
    },
    {
      id: "email",
      label: "Email",
      accessor: (row) => row.email,
    },
    {
      id: "status",
      label: "Status",
      accessor: (row) => row.status,
      align: "center",
      render: (row, value) => (
        <Chip
          label={value}
          size="small"
          color={row.status === "Active" ? "success" : "default"}
        />
      ),
    },
    {
      id: "balance",
      label: "Balance",
      accessor: (row) => row.balance,
      align: "right",
      render: (_, value) => `$${Number(value).toFixed(2)}`,
    },
    {
      id: "actions",
      label: "Actions",
      accessor: () => "",
      align: "center",
      render: (row) => {
        const actions: ActionMenuItem[] = [
          {
            id: "view",
            label: "View Details",
            icon: VisibilityIcon,
            onClick: () => console.log("View", row.id),
          },
          {
            id: "edit",
            label: "Edit",
            icon: EditIcon,
            onClick: () => console.log("Edit", row.id),
          },
          {
            id: "delete",
            label: "Delete",
            icon: DeleteIcon,
            onClick: () => console.log("Delete", row.id),
            destructive: true,
            divider: true,
          },
        ];
        return <ActionsMenu actions={actions} ariaLabel={`Actions for ${row.name}`} />;
      },
    },
  ];

  // Filter users based on search and status
  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ pb: 3 }}>
      {/* Demo AppBar with PreferencesMenu */}
      <AppBar position="static" color="default" elevation={1} sx={{ mb: 3 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Component Showcase
          </Typography>
          <Typography variant="caption" sx={{ mr: 2, color: 'text.secondary' }}>
            Currency: {preferredCurrency} | Compact: {useCompactLayout ? 'ON' : 'OFF'}
          </Typography>
          <PreferencesMenu />
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 3, maxWidth: 1200, mx: "auto" }}>
      <SectionHeader
        variant="h4"
        subtitle="Demonstration of all reusable components including new personalization features"
        marginBottom={4}
      >
        UI Personalization Features
      </SectionHeader>

      <Stack spacing={4}>
        {/* Personalization Demo */}
        <Panel
          title="Personalization Settings"
          subtitle="Click the 3-dot menu in the AppBar above to change preferences"
        >
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              The preferences menu allows you to customize:
            </Typography>
            <Box component="ul" sx={{ pl: 3 }}>
              <Typography component="li" variant="body2">
                <strong>Preferred Currency:</strong> Changes how all monetary values are displayed (USD, EUR, NGN, BTC)
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Compact Layout:</strong> Reduces spacing in metric cards for a denser view
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Language:</strong> Reserved for future implementation
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              <strong>Current Settings:</strong> Currency = {preferredCurrency}, Compact Layout = {useCompactLayout ? 'Enabled' : 'Disabled'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All preferences are persisted to localStorage and restored on page reload.
            </Typography>
          </Stack>
        </Panel>

        {/* MetricCard Examples */}
        <Box>
          <SectionHeader variant="h5" marginBottom={3}>
            Metric Cards {useCompactLayout && '(Compact Mode)'}
          </SectionHeader>
          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
            }}
          >
            <MetricCard
              title="Total Users"
              value={1234}
              icon={PeopleIcon}
              color="primary"
              secondaryText="+12% this month"
            />
            <MetricCard
              title="Revenue"
              value={formatCurrencyByPreference(45678, preferredCurrency)}
              icon={TrendingUpIcon}
              color="success"
              secondaryText="+8% vs last month"
            />
            <MetricCard
              title="Total Balance"
              value={formatCurrencyByPreference(89234, preferredCurrency)}
              icon={AccountBalanceIcon}
              color="info"
              secondaryText="Across all accounts"
            />
          </Box>
        </Box>

        {/* Panel Examples */}
        <Panel
          title="Panel Component"
          subtitle="Panels can contain any content with optional header and footer"
          actions={<Button variant="outlined" size="small">Action</Button>}
          footer={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button variant="outlined" size="small">Cancel</Button>
              <Button variant="contained" size="small">Save</Button>
            </Box>
          }
        >
          <Typography variant="body2" color="text.secondary">
            This is a panel with a title, subtitle, actions, and footer. It provides
            a consistent way to group content across the application.
          </Typography>
        </Panel>

        {/* FilterBar and DataTable Example */}
        <Panel
          title="Data Table with Filters"
          subtitle="Demonstrating FilterBar and DataTable components"
        >
          <Stack spacing={3}>
            <FilterBar spacing={2} justifyContent="space-between">
              <TextField
                size="small"
                label="Search"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" size="small">
                Apply Filters
              </Button>
            </FilterBar>

            <DataTable
              columns={columns}
              rows={filteredUsers}
              getRowKey={(row) => row.id}
              emptyMessage="No users found matching your filters"
              striped
            />
          </Stack>
        </Panel>

        {/* ActionsMenu Standalone Example */}
        <Panel title="Actions Menu" subtitle="Click the menu button to see available actions">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2">Standalone Actions Menu:</Typography>
            <ActionsMenu
              actions={[
                { id: "action1", label: "Action 1", onClick: () => alert("Action 1") },
                { id: "action2", label: "Action 2", onClick: () => alert("Action 2") },
                {
                  id: "action3",
                  label: "Dangerous Action",
                  onClick: () => alert("Dangerous Action"),
                  destructive: true,
                },
              ]}
            />
          </Box>
        </Panel>

        {/* Usage Documentation */}
        <Panel title="Usage" subtitle="How to use these components in your code">
          <Stack spacing={2}>
            <Typography variant="body2" component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: "auto" }}>
{`import {
  MetricCard,
  DataTable,
  FilterBar,
  ActionsMenu,
  Panel,
  SectionHeader,
  PreferencesMenu,
} from "@/components/shared";
import { useDashboardStore } from "@/stores/dashboard-store";
import { formatCurrencyByPreference } from "@/utils/currency";`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All components are exported from <code>@/components/shared</code> and follow
              Material UI design patterns. They use theme values for consistent styling,
              include TypeScript types, and have built-in accessibility features.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>New in P2:</strong> PreferencesMenu integrates with the dashboard store
              to provide persistent UI personalization including currency formatting and compact layout options.
            </Typography>
          </Stack>
        </Panel>
      </Stack>
      </Box>
    </Box>
  );
};
