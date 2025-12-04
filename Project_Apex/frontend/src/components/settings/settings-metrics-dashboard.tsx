import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp,
  TrendingDown,
  Sync,
  Error as ErrorIcon,
  CheckCircle,
  AccessTime,
} from '@mui/icons-material';
import { useSettingsAnalytics, SettingsUsageStats } from '@/hooks/use-settings-analytics';
import { useSettingsSync } from '@/services/settings-sync-service';

interface MetricsDashboardProps {
  timeRange?: 'day' | 'week' | 'month';
}

export const SettingsMetricsDashboard = ({ timeRange = 'week' }: MetricsDashboardProps) => {
  const analytics = useSettingsAnalytics();
  const syncService = useSettingsSync();
  const [metrics, setMetrics] = useState<SettingsUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const usageStats = await analytics.getSettingsUsage(timeRange);
      setMetrics(usageStats);
    } catch (err) {
      setError('Failed to load metrics data');
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncStatus = syncService.syncStatus;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert severity="info">
        No metrics data available for the selected time range.
      </Alert>
    );
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp color="success" />;
    if (current < previous) return <TrendingDown color="error" />;
    return <TrendingUp color="disabled" />;
  };

  const getSyncStatusColor = () => {
    if (!syncStatus.isOnline) return 'error';
    if (syncStatus.isSyncing) return 'warning';
    if (syncStatus.pendingChanges > 0) return 'warning';
    return 'success';
  };

  const getSyncStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing) return 'Syncing';
    if (syncStatus.pendingChanges > 0) return `${syncStatus.pendingChanges} pending`;
    return 'Synced';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings Performance Dashboard
      </Typography>

      {/* Sync Status Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" display="flex" alignItems="center" gap={1}>
              <Sync />
              Sync Status
            </Typography>
            <Chip
              label={getSyncStatusText()}
              color={getSyncStatusColor()}
              variant="filled"
            />
          </Box>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4" color={syncStatus.isOnline ? 'success.main' : 'error.main'}>
                  {syncStatus.isOnline ? '🟢' : '🔴'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connection
                </Typography>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4">
                  {syncStatus.pendingChanges}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Changes
                </Typography>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4">
                  {syncStatus.conflicts.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Conflicts
                </Typography>
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box textAlign="center">
                <Typography variant="h4">
                  {syncStatus.lastSync ? '🕒' : '--'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last Sync
                </Typography>
                {syncStatus.lastSync && (
                  <Typography variant="caption">
                    {new Date(syncStatus.lastSync).toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Grid container spacing={3}>
        {/* Usage Statistics */}
  <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Usage Statistics
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Total Views</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6">{metrics.totalViews}</Typography>
                    {getTrendIcon(metrics.totalViews, 0)}
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Settings Changes</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6">{metrics.totalChanges}</Typography>
                    {getTrendIcon(metrics.totalChanges, 0)}
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Successful Saves</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6">{metrics.totalSaves}</Typography>
                    <CheckCircle color="success" />
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Errors</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6" color="error.main">
                      {metrics.totalErrors}
                    </Typography>
                    <ErrorIcon color="error" />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

    {/* Performance Metrics */}
  <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={3}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Error Rate</Typography>
                    <Typography variant="body2">
                      {(metrics.errorRate * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.errorRate * 100}
                    color={metrics.errorRate > 0.1 ? 'error' : 'primary'}
                  />
                </Box>
                
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Save Success Rate</Typography>
                    <Typography variant="body2">
                      {(metrics.saveSuccessRate * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={metrics.saveSuccessRate * 100}
                    color={metrics.saveSuccessRate > 0.9 ? 'success' : 'warning'}
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" display="flex" alignItems="center" gap={1}>
                    <AccessTime />
                    Avg Load Time
                  </Typography>
                  <Typography variant="h6">
                    {metrics.averageLoadTime.toFixed(0)}ms
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" display="flex" alignItems="center" gap={1}>
                    <AccessTime />
                    Avg Save Time
                  </Typography>
                  <Typography variant="h6">
                    {metrics.averageSaveTime.toFixed(0)}ms
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

    {/* Most Changed Settings */}
  <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Most Changed Settings
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Setting</TableCell>
                      <TableCell align="right">Change Count</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.mostChangedSettings.map((setting) => (
                      <TableRow key={setting.settingKey}>
                        <TableCell>
                          <Typography variant="body2">
                            {setting.settingKey}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {setting.changeCount}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {((setting.changeCount / metrics.totalChanges) * 100).toFixed(1)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {metrics.mostChangedSettings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No settings changes recorded
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary.main">
                {metrics.totalViews}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Page Views
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {metrics.totalSaves}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Successful Saves
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="error.main">
                {metrics.totalErrors}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Errors
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main">
                {metrics.totalConflicts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sync Conflicts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};