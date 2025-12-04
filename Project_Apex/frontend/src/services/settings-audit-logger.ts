import { SettingsChange } from './settings-sync-service';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'sync' | 'conflict' | 'resolve';
  settingType: string;
  settingKey?: string;
  oldValue?: any;
  newValue?: any;
  deviceId: string;
  sessionId: string;
  ipAddress?: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

export interface AuditLogQuery {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  settingType?: string;
  limit?: number;
  offset?: number;
}

export class SettingsAuditLogger {
  private static instance: SettingsAuditLogger;
  private logs: AuditLogEntry[] = [];
  private maxLogSize = 10000; // Maximum number of logs to keep in memory

  private constructor() {
    this.loadStoredLogs();
  }

  public static getInstance(): SettingsAuditLogger {
    if (!SettingsAuditLogger.instance) {
      SettingsAuditLogger.instance = new SettingsAuditLogger();
    }
    return SettingsAuditLogger.instance;
  }

  private loadStoredLogs(): void {
    try {
      const stored = localStorage.getItem('settings_audit_logs');
      if (stored) {
        this.logs = JSON.parse(stored).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      localStorage.setItem('settings_audit_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save audit logs:', error);
    }
  }

  public logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.logs.unshift(fullEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(0, this.maxLogSize);
    }

    this.saveLogs();
    this.sendToBackend(fullEntry);
  }

  public logSettingChange(change: SettingsChange, action: 'update' | 'create' | 'delete'): void {
    this.logAction({
      userId: change.userId,
      action,
      settingType: change.settingType,
      settingKey: change.settingKey,
      oldValue: change.oldValue,
      newValue: change.newValue,
      deviceId: change.deviceId,
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      metadata: {
        version: change.version,
        changeId: change.id,
      },
    });
  }

  public logSyncEvent(userId: string, deviceId: string, action: 'sync' | 'conflict' | 'resolve', metadata?: any): void {
    this.logAction({
      userId,
      action,
      settingType: 'sync',
      deviceId,
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      metadata,
    });
  }

  public getLogs(query: AuditLogQuery = {}): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (query.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endDate!);
    }

    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
    }

    if (query.action) {
      filteredLogs = filteredLogs.filter(log => log.action === query.action);
    }

    if (query.settingType) {
      filteredLogs = filteredLogs.filter(log => log.settingType === query.settingType);
    }

    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return filteredLogs.slice(offset, offset + limit);
  }

  public getStats(timeRange: 'day' | 'week' | 'month' = 'week'): AuditStats {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    const recentLogs = this.logs.filter(log => log.timestamp >= startDate);

    const actions = recentLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const settingTypes = recentLogs.reduce((acc, log) => {
      if (log.settingType && log.settingType !== 'sync') {
        acc[log.settingType] = (acc[log.settingType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const devices = recentLogs.reduce((acc, log) => {
      acc[log.deviceId] = (acc[log.deviceId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalActions: recentLogs.length,
      actions,
      settingTypes,
      devices,
      timeRange,
    };
  }

  public exportLogs(): Blob {
    const exportData = {
      logs: this.logs,
      exportTimestamp: new Date().toISOString(),
      totalLogs: this.logs.length,
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
  }

  public clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('settings_audit_logs');
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('settings_audit_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('settings_audit_session_id', sessionId);
    }
    return sessionId;
  }

  private sendToBackend(entry: AuditLogEntry): void {
    // In a real implementation, this would send to your backend
    // For now, we'll simulate the API call
    if (navigator.sendBeacon) {
      const data = JSON.stringify(entry);
      navigator.sendBeacon('/api/audit/settings', data);
    } else {
      fetch('/api/audit/settings', {
        method: 'POST',
        body: JSON.stringify(entry),
        headers: {
          'Content-Type': 'application/json',
        },
        keepalive: true,
      }).catch(error => {
        console.error('Failed to send audit log:', error);
      });
    }
  }
}

export interface AuditStats {
  totalActions: number;
  actions: Record<string, number>;
  settingTypes: Record<string, number>;
  devices: Record<string, number>;
  timeRange: string;
}

// React hook for using audit logger
export const useSettingsAuditLogger = () => {
  const logger = SettingsAuditLogger.getInstance();

  const logSettingChange = (change: SettingsChange, action: 'update' | 'create' | 'delete') => {
    logger.logSettingChange(change, action);
  };

  const logSyncEvent = (userId: string, deviceId: string, action: 'sync' | 'conflict' | 'resolve', metadata?: any) => {
    logger.logSyncEvent(userId, deviceId, action, metadata);
  };

  const getLogs = (query?: AuditLogQuery) => {
    return logger.getLogs(query);
  };

  const getStats = (timeRange?: 'day' | 'week' | 'month') => {
    return logger.getStats(timeRange);
  };

  const exportLogs = () => {
    return logger.exportLogs();
  };

  return {
    logSettingChange,
    logSyncEvent,
    getLogs,
    getStats,
    exportLogs,
  };
};

// Integration with sync service
export const setupAuditIntegration = () => {
  const logger = SettingsAuditLogger.getInstance();
  // Lazily load sync service if needed in the future; currently unused
  // const syncService = require('./settings-sync-service').getSettingsSyncService();

  type SettingsUpdatedDetail = {
    settingType: string;
    settingKey?: string;
    value: any;
  };

  type SettingsConflictDetail = {
    localChange: SettingsChange;
    remoteChange: SettingsChange;
  };

  // Listen for settings changes
  window.addEventListener('settingsUpdated', (event: Event) => {
    const { settingType, settingKey, value } = (event as CustomEvent<SettingsUpdatedDetail>).detail;
    
    // We don't have the full change context here, so we log a generic update
    logger.logAction({
      userId: 'current', // Would be replaced with actual user ID
      action: 'update',
      settingType,
      settingKey,
      newValue: value,
      deviceId: 'browser',
      sessionId: logger['getSessionId'](),
      userAgent: navigator.userAgent,
    });
  });

  // Listen for sync conflicts
  window.addEventListener('settingsConflict', (event: Event) => {
    const conflict = (event as CustomEvent<SettingsConflictDetail>).detail;
    
    logger.logSyncEvent(
      conflict.localChange.userId,
      conflict.localChange.deviceId,
      'conflict',
      {
        localVersion: conflict.localChange.version,
        remoteVersion: conflict.remoteChange.version,
        settingType: conflict.localChange.settingType,
        settingKey: conflict.localChange.settingKey,
      }
    );
  });
};

// Initialize audit integration
if (typeof window !== 'undefined') {
  setupAuditIntegration();
}