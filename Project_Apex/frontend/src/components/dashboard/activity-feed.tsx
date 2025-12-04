import { motion } from "motion/react";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { People, TrendingUp, MyLocation, EmojiEvents } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

interface ActivityItem {
  id: string;
  type: 'copy_trading' | 'performance' | 'milestone' | 'system';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ComponentType<any>;
  color: 'success' | 'primary' | 'warning' | 'error';
  metadata?: {
    amount?: number;
    roi?: number;
    traderName?: string;
    event?: 'started' | 'paused' | 'resumed' | 'stopped' | 'roi';
  };
}

export const ActivityFeed = () => {
  const theme = useTheme();
  // Mock data for demonstration - in production this would come from API
  const mockActivities: ActivityItem[] = [
    {
      id: "1",
      type: 'copy_trading',
      title: 'New Copy Trading Relationship',
      description: 'Started copying trader John Forex',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      icon: People,
      color: 'primary',
      metadata: {
        amount: 2500,
        traderName: 'John Forex',
        event: 'started',
      }
    },
    {
      id: "2",
      type: 'performance',
      title: 'ROI Achievement',
      description: 'Reached 5.2% ROI on active portfolio',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
      icon: TrendingUp,
      color: 'success',
      metadata: {
        roi: 5.2
      }
    },
    {
      id: "3",
      type: 'milestone',
      title: 'Trading Milestone',
      description: 'Completed 50 successful copy trades',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      icon: MyLocation,
      color: 'primary'
    },
    {
      id: "4",
      type: 'system',
      title: 'Weekly Performance',
      description: 'Your portfolio outperformed 78% of users this week',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      icon: EmojiEvents,
      color: 'success'
    }
  ];

  const activities = mockActivities; // Replace with real data when API is available

  const getActivityIcon = (activity: ActivityItem) => {
    const IconComponent = activity.icon;
    return (
      <Box
        sx={{
          borderRadius: 1,
          p: 1,
          backgroundColor: theme.palette[activity.color].light,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <IconComponent
          sx={{
            fontSize: 16,
            color: theme.palette[activity.color].main
          }}
        />
      </Box>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const renderActivityContent = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'copy_trading':
        return (
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                {activity.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activity.description}
              </Typography>
              {activity.metadata?.event && (
                <Chip
                  label={
                    activity.metadata.event === 'roi'
                      ? 'Copy ROI'
                      : `Copy ${activity.metadata.event.charAt(0).toUpperCase()}${activity.metadata.event.slice(1)}`
                  }
                  size="small"
                  color={
                    activity.metadata.event === 'started' || activity.metadata.event === 'resumed'
                      ? 'success'
                      : activity.metadata.event === 'paused'
                      ? 'warning'
                      : activity.metadata.event === 'stopped'
                      ? 'error'
                      : 'primary'
                  }
                  sx={{ mt: 0.5, mr: 0.5 }}
                />
              )}
              {activity.metadata?.amount && (
                <Typography
                  variant="caption"
                  color="primary.main"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  Allocation: {formatCurrency(activity.metadata.amount)}
                </Typography>
              )}
            </Box>
          </Stack>
        );
      
      case 'performance':
        return (
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                {activity.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activity.description}
              </Typography>
              {activity.metadata?.roi && (
                <Typography
                  variant="caption"
                  color="success.main"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  ROI: {formatPercent(activity.metadata.roi)}
                </Typography>
              )}
            </Box>
          </Stack>
        );
      
      case 'milestone':
        return (
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                {activity.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activity.description}
              </Typography>
            </Box>
          </Stack>
        );
      
      case 'system':
        return (
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                {activity.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activity.description}
              </Typography>
            </Box>
          </Stack>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "none",
        boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
        backgroundColor: 'background.paper',
        p: 3
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight="semibold" color="text.primary">
          Activity Feed
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Recent system-wide activities and achievements
        </Typography>
      </Box>

      <Stack spacing={2}>
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                borderRadius: 2,
                border: "none",
                boxShadow: "0px 1px 3px rgba(0,0,0,0.04)",
                backgroundColor: 'background.paper',
                p: 2,
                transition: 'box-shadow 0.12s ease-in-out',
                '&:hover': {
                  boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
                }
              }}
            >
              {getActivityIcon(activity)}
              
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {renderActivityContent(activity)}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {formatTimestamp(activity.timestamp)}
                </Typography>
              </Box>

              <Chip
                label={activity.type === 'copy_trading' ? 'Copy relationship' : activity.type.replace('_', ' ')}
                color={activity.color}
                size="small"
              />
            </Box>
          </motion.div>
        ))}
      </Stack>

      {activities.length === 0 && (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <People sx={{ fontSize: 48, color: 'text.secondary', mb: 1, mx: 'auto' }} />
          <Typography variant="body2" color="text.secondary">
            No recent activities
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Activities will appear here as you use the platform
          </Typography>
        </Box>
      )}
    </Box>
  );
};


