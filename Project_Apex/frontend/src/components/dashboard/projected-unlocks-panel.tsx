import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";

import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
// Note: LongTermWorkerService is not present in the generated client. This panel is temporarily disabled.

// Define shapes for the maturities payload to satisfy TypeScript
type UpcomingMaturitiesItem = {
  investment_id: string;
  plan_name: string;
  plan_tier: string;
  allocation: number;
  maturity_date: string;
  days_until_maturity: number;
};
type UpcomingMaturitiesResponse = {
  maturities: UpcomingMaturitiesItem[];
  total_amount: number;
  next_30_days: number;
  next_90_days?: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

interface ProjectedUnlocksPanelProps {
  daysAhead?: number;
  showNotificationToggle?: boolean;
}

export const ProjectedUnlocksPanel = ({ 
  daysAhead = 90, 
  showNotificationToggle = true 
}: ProjectedUnlocksPanelProps) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const { data, isLoading, error } = useQuery<UpcomingMaturitiesResponse>({
    queryKey: ["user-upcoming-maturities", daysAhead],
    // Stubbed response until backend exposes this endpoint in OpenAPI
    queryFn: async () => ({ maturities: [], total_amount: 0, next_30_days: 0 }),
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const maturities = (data?.maturities ?? []) as UpcomingMaturitiesItem[];
  const totalAmount = data?.total_amount || 0;
  const next30Days = data?.next_30_days || 0;
  // next_90_days is available but not currently displayed; add UI later if needed.

  const getDaysColor = (days: number) => {
    if (days <= 7) return "error";
    if (days <= 30) return "warning";
    return "success";
  };

  const getDaysText = (days: number) => {
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-border-secondary bg-bg-primary p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Projected Unlocks</h2>
        <div className="text-sm text-error-600 bg-error-50 p-3 rounded-md">
          Failed to load projected unlocks. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-secondary bg-bg-primary p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary">Projected Unlocks</h2>
        {showNotificationToggle && (
          <FormControlLabel
            control={
              <Switch
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                size="small"
              />
            }
            label="Alerts"
            className="text-sm"
          />
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <div className="text-2xl font-semibold text-primary">{maturities.length}</div>
          <div className="text-xs text-tertiary">Total</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-warning/20">
          <div className="text-2xl font-semibold text-primary">{next30Days}</div>
          <div className="text-xs text-tertiary">Next 30d</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-success/20">
          <div className="text-2xl font-semibold text-primary">{formatCurrency(totalAmount)}</div>
          <div className="text-xs text-tertiary">Total Value</div>
        </div>
      </div>

      {/* Maturities List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="h-16 rounded-lg bg-secondary"></div>
            </div>
          ))
        ) : maturities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-tertiary mb-2">No upcoming unlocks</div>
            <div className="text-sm text-tertiary/70">
              Investments will appear here when they approach maturity
            </div>
          </div>
        ) : (
          maturities.map((maturity) => (
            <motion.div
              key={maturity.investment_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-lg border border-border-secondary hover:border-brand-solid/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-primary truncate">
                    {maturity.plan_name}
                  </h3>
                  <Chip
                    label={maturity.plan_tier.replace(/_/g, " ")}
                    color="primary"
                    size="small"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-tertiary">
                  <span>{formatCurrency(maturity.allocation)}</span>
                  <span>•</span>
                  <span>Unlocks {formatDate(maturity.maturity_date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Chip
                  label={getDaysText(maturity.days_until_maturity)}
                  color={getDaysColor(maturity.days_until_maturity)}
                  size="small"
                  variant={maturity.days_until_maturity <= 7 ? "filled" : "outlined"}
                />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      {maturities.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border-secondary">
          <div className="flex gap-2">
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                // Export functionality could be added here
                console.log("Export maturities data");
              }}
            >
              Export
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                // Calendar integration could be added here
                console.log("Add to calendar");
              }}
            >
              Calendar
            </Button>
          </div>
        </div>
      )}

      {/* Notification Status */}
      {showNotificationToggle && (
        <div className="mt-4 text-xs text-tertiary">
          {notificationsEnabled ? (
            <span className="text-success-600">✓ Maturity alerts enabled</span>
          ) : (
            <span className="text-tertiary">Maturity alerts disabled</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectedUnlocksPanel;