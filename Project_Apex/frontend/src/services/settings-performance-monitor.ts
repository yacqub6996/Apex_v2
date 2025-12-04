import { SettingsChange } from './settings-sync-service';

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  metricType: 'sync_latency' | 'conflict_resolution' | 'storage_operation' | 'network_request' | 'ui_interaction';
  value: number;
  unit: 'ms' | 'count' | 'bytes' | 'percentage';
  metadata?: Record<string, any>;
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  alertType: 'high_latency' | 'conflict_rate' | 'storage_full' | 'network_error' | 'sync_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: PerformanceMetric;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface PerformanceStats {
  averageSyncLatency: number;
  conflictRate: number;
  storageUsage: number;
  networkSuccessRate: number;
  uiResponseTime: number;
  lastUpdated: Date;
}

export class SettingsPerformanceMonitor {
  private static instance: SettingsPerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private maxMetrics = 5000;
  private maxAlerts = 1000;

  // Thresholds for alerts
  private thresholds = {
    syncLatency: 1000, // ms
    conflictRate: 0.1, // 10%
    storageUsage: 0.8, // 80%
    networkErrorRate: 0.05, // 5%
    uiResponseTime: 300, // ms
  };

  private constructor() {
    this.loadStoredData();
    this.startPeriodicMonitoring();
  }

  private startPeriodicMonitoring(): void {
    // Monitor storage usage every minute
    setInterval(() => {
      const storageUsage = this.calculateStorageUsage();
      if (storageUsage > this.thresholds.storageUsage) {
        const metric: PerformanceMetric = {
          id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          metricType: 'storage_operation',
          value: storageUsage,
          unit: 'percentage',
          metadata: { usage: storageUsage },
        };
        this.createAlert({
          alertType: 'storage_full',
          severity: storageUsage > 0.9 ? 'critical' : 'high',
          message: `High storage usage: ${(storageUsage * 100).toFixed(1)}%`,
          metric,
        });
      }
    }, 60000); // Every minute
  }

  public static getInstance(): SettingsPerformanceMonitor {
    if (!SettingsPerformanceMonitor.instance) {
      SettingsPerformanceMonitor.instance = new SettingsPerformanceMonitor();
    }
    return SettingsPerformanceMonitor.instance;
  }

  private loadStoredData(): void {
    try {
      const storedMetrics = localStorage.getItem('settings_performance_metrics');
      const storedAlerts = localStorage.getItem('settings_performance_alerts');

      if (storedMetrics) {
        this.metrics = JSON.parse(storedMetrics).map((metric: any) => ({
          ...metric,
          timestamp: new Date(metric.timestamp),
        }));
      }

      if (storedAlerts) {
        this.alerts = JSON.parse(storedAlerts).map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
          resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined,
        }));
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
      this.metrics = [];
      this.alerts = [];
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('settings_performance_metrics', JSON.stringify(this.metrics));
      localStorage.setItem('settings_performance_alerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.error('Failed to save performance data:', error);
    }
  }

  public recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.saveData();
    this.checkThresholds(fullMetric);
  }

  public recordSyncLatency(latency: number, metadata?: any): void {
    this.recordMetric({
      metricType: 'sync_latency',
      value: latency,
      unit: 'ms',
      metadata,
    });
  }

  public recordConflictResolution(time: number, metadata?: any): void {
    this.recordMetric({
      metricType: 'conflict_resolution',
      value: time,
      unit: 'ms',
      metadata,
    });
  }

  public recordStorageOperation(time: number, operation: string): void {
    this.recordMetric({
      metricType: 'storage_operation',
      value: time,
      unit: 'ms',
      metadata: { operation },
    });
  }

  public recordNetworkRequest(time: number, success: boolean, endpoint: string): void {
    this.recordMetric({
      metricType: 'network_request',
      value: time,
      unit: 'ms',
      metadata: { success, endpoint },
    });
  }

  public recordUIInteraction(time: number, interaction: string): void {
    this.recordMetric({
      metricType: 'ui_interaction',
      value: time,
      unit: 'ms',
      metadata: { interaction },
    });
  }

  private checkThresholds(metric: PerformanceMetric): void {
    switch (metric.metricType) {
      case 'sync_latency':
        if (metric.value > this.thresholds.syncLatency) {
          this.createAlert({
            alertType: 'high_latency',
            severity: metric.value > 5000 ? 'critical' : metric.value > 2000 ? 'high' : 'medium',
            message: `High sync latency detected: ${metric.value}ms`,
            metric,
          });
        }
        break;

      case 'conflict_resolution': {
        // Calculate conflict rate from recent metrics
        const recentMetrics = this.metrics.filter(m => 
          m.metricType === 'conflict_resolution' && 
          Date.now() - m.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
        );
        const conflictRate = recentMetrics.length / Math.max(1, this.metrics.filter(m => 
          m.metricType === 'sync_latency' && 
          Date.now() - m.timestamp.getTime() < 5 * 60 * 1000
        ).length);

        if (conflictRate > this.thresholds.conflictRate) {
          this.createAlert({
            alertType: 'conflict_rate',
            severity: conflictRate > 0.2 ? 'high' : 'medium',
            message: `High conflict rate detected: ${(conflictRate * 100).toFixed(1)}%`,
            metric,
          });
        }
        break;
      }

      case 'network_request': {
        if (!metric.metadata?.success) {
          const recentNetworkMetrics = this.metrics.filter(m => 
            m.metricType === 'network_request' && 
            Date.now() - m.timestamp.getTime() < 2 * 60 * 1000 // Last 2 minutes
          );
          const errorRate = recentNetworkMetrics.filter(m => !m.metadata?.success).length / Math.max(1, recentNetworkMetrics.length);

          if (errorRate > this.thresholds.networkErrorRate) {
            this.createAlert({
              alertType: 'network_error',
              severity: errorRate > 0.1 ? 'high' : 'medium',
              message: `High network error rate: ${(errorRate * 100).toFixed(1)}%`,
              metric,
            });
          }
        }
        break;
      }
    }
  }

  private createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const fullAlert: PerformanceAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(fullAlert);

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    this.saveData();
    this.notifyAlert(fullAlert);
  }

  private notifyAlert(alert: PerformanceAlert): void {
    // In a real implementation, this would send notifications
    console.warn('Performance Alert:', alert);

    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('settingsPerformanceAlert', {
      detail: alert,
    }));

    // Send to backend for centralized monitoring
    this.sendAlertToBackend(alert);
  }

  public resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.saveData();
    }
  }

  public getStats(timeRange: 'hour' | 'day' | 'week' = 'day'): PerformanceStats {
    const now = new Date();
    let startTime: number;

    switch (timeRange) {
      case 'hour':
        startTime = now.getTime() - 60 * 60 * 1000;
        break;
      case 'day':
        startTime = now.getTime() - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = 0;
    }

    const recentMetrics = this.metrics.filter(m => m.timestamp.getTime() >= startTime);

    const syncLatencies = recentMetrics
      .filter(m => m.metricType === 'sync_latency')
      .map(m => m.value);
    
    const conflictResolutions = recentMetrics
      .filter(m => m.metricType === 'conflict_resolution')
      .map(m => m.value);
    
    const networkRequests = recentMetrics
      .filter(m => m.metricType === 'network_request');
    
    const uiInteractions = recentMetrics
      .filter(m => m.metricType === 'ui_interaction')
      .map(m => m.value);

    const totalSyncs = syncLatencies.length;
    const totalConflicts = conflictResolutions.length;
    const successfulRequests = networkRequests.filter(r => r.metadata?.success).length;
    const totalRequests = networkRequests.length;

    return {
      averageSyncLatency: syncLatencies.length ? syncLatencies.reduce((a, b) => a + b, 0) / syncLatencies.length : 0,
      conflictRate: totalSyncs ? totalConflicts / totalSyncs : 0,
      storageUsage: this.calculateStorageUsage(),
      networkSuccessRate: totalRequests ? successfulRequests / totalRequests : 1,
      uiResponseTime: uiInteractions.length ? uiInteractions.reduce((a, b) => a + b, 0) / uiInteractions.length : 0,
      lastUpdated: new Date(),
    };
  }

  private calculateStorageUsage(): number {
    try {
      const total = 5 * 1024 * 1024; // 5MB localStorage limit
      let used = 0;
      
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          used += localStorage[key].length * 2; // UTF-16 characters use 2 bytes
        }
      }
      
      return used / total;
    } catch (error) {
      return 0;
    }
  }

  public getAlerts(includeResolved = false, severity?: string[]): PerformanceAlert[] {
    let filteredAlerts = this.alerts;

    if (!includeResolved) {
      filteredAlerts = filteredAlerts.filter(alert => !alert.resolved);
    }

    if (severity && severity.length > 0) {
      filteredAlerts = filteredAlerts.filter(alert => severity.includes(alert.severity));
    }

    return filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public exportMetrics(): Blob {
    const exportData = {
      metrics: this.metrics,
      alerts: this.alerts,
      stats: this.getStats(),
      exportTimestamp: new Date().toISOString(),
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
  }

  public clearData(): void {
    this.metrics = [];
    this.alerts = [];
    localStorage.removeItem('settings_performance_metrics');
    localStorage.removeItem('settings_performance_alerts');
  }


  private sendAlertToBackend(alert: PerformanceAlert): void {
    // In a real implementation, this would send to your monitoring backend
    if (navigator.sendBeacon) {
      const data = JSON.stringify(alert);
      navigator.sendBeacon('/api/monitoring/alerts', data);
    } else {
      fetch('/api/monitoring/alerts', {
        method: 'POST',
        body: JSON.stringify(alert),
        headers: {
          'Content-Type': 'application/json',
        },
        keepalive: true,
      }).catch(error => {
        console.error('Failed to send alert:', error);
      });
    }
  }
}

// React hook for using performance monitor
export const useSettingsPerformanceMonitor = () => {
  const monitor = SettingsPerformanceMonitor.getInstance();

  const recordSyncLatency = (latency: number, metadata?: any) => {
    monitor.recordSyncLatency(latency, metadata);
  };

  const recordConflictResolution = (time: number, metadata?: any) => {
    monitor.recordConflictResolution(time, metadata);
  };

  const recordUIInteraction = (time: number, interaction: string) => {
    monitor.recordUIInteraction(time, interaction);
  };

  const getStats = (timeRange?: 'hour' | 'day' | 'week') => {
    return monitor.getStats(timeRange);
  };

  const getAlerts = (includeResolved?: boolean, severity?: string[]) => {
    return monitor.getAlerts(includeResolved, severity);
  };

  const resolveAlert = (alertId: string) => {
    monitor.resolveAlert(alertId);
  };

  return {
    recordSyncLatency,
    recordConflictResolution,
    recordUIInteraction,
    getStats,
    getAlerts,
    resolveAlert,
  };
};

// Integration with sync service
export const setupPerformanceMonitoring = async () => {
  const monitor = SettingsPerformanceMonitor.getInstance();
  const { getSettingsSyncService } = await import('./settings-sync-service');
  const syncService = getSettingsSyncService();

  // Monitor sync operations (original method expects no args)
  const originalSync = (syncService.syncSettings as unknown as () => Promise<unknown>).bind(syncService);
  syncService.syncSettings = async function() {
    const startTime = performance.now();
    try {
      const result = await originalSync();
      const latency = performance.now() - startTime;
      monitor.recordSyncLatency(latency, { success: true });
      return result as any;
    } catch (error) {
      const latency = performance.now() - startTime;
      const msg = error instanceof Error ? error.message : String(error);
      monitor.recordSyncLatency(latency, { success: false, error: msg });
      throw error;
    }
  } as any;

  // Monitor conflict resolution
  type SettingsConflictDetail = {
    localChange: SettingsChange;
    remoteChange: SettingsChange;
  };

  window.addEventListener('settingsConflict', (event: Event) => {
    const conflict = (event as CustomEvent<SettingsConflictDetail>).detail;
    const resolutionTime = performance.now();
    
    // We'll record the resolution time when it's actually resolved
    setTimeout(() => {
      monitor.recordConflictResolution(performance.now() - resolutionTime, {
        settingType: conflict.localChange.settingType,
        settingKey: conflict.localChange.settingKey,
      });
    }, 1000); // Assume resolution within 1 second
  });
};

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  setupPerformanceMonitoring();
}