import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';

export interface SettingsChange {
  id: string;
  userId: string;
  settingType: 'profile' | 'security' | 'notifications' | 'privacy';
  settingKey: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  deviceId: string;
  version: number;
}

export interface SyncConflict {
  localChange: SettingsChange;
  remoteChange: SettingsChange;
  resolvedValue?: any;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  conflicts: SyncConflict[];
}

export interface SettingsSyncService {
  syncStatus: SyncStatus;
  syncSettings: () => Promise<void>;
  queueChange: (change: Omit<SettingsChange, 'id' | 'timestamp' | 'version'>) => void;
  resolveConflict: (conflict: SyncConflict, resolvedValue: any) => void;
  getOfflineChanges: () => SettingsChange[];
  clearOfflineChanges: () => void;
}

class SettingsSyncServiceImpl implements SettingsSyncService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingChanges: SettingsChange[] = [];
  private conflicts: SyncConflict[] = [];
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private lastSync: Date | null = null;
  private deviceId: string;
  private authToken: string | null = null;

  constructor() {
    this.deviceId = this.getDeviceId();
    this.setupNetworkListeners();
    this.loadPendingChanges();
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('settings_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('settings_device_id', deviceId);
    }
    return deviceId;
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.connectWebSocket();
      this.syncSettings();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.disconnectWebSocket();
    });
  }

  private loadPendingChanges(): void {
    try {
      const stored = localStorage.getItem('settings_pending_changes');
      if (stored) {
        this.pendingChanges = JSON.parse(stored).map((change: any) => ({
          ...change,
          timestamp: new Date(change.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load pending changes:', error);
      this.pendingChanges = [];
    }
  }

  private savePendingChanges(): void {
    try {
      localStorage.setItem('settings_pending_changes', JSON.stringify(this.pendingChanges));
    } catch (error) {
      console.error('Failed to save pending changes:', error);
    }
  }

  private connectWebSocket(): void {
    if (!this.authToken || this.ws) return;

    try {
      const wsUrl = `ws://${window.location.host}/ws/settings?token=${this.authToken}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Settings WebSocket connected');
        this.syncSettings();
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.ws.onclose = () => {
        console.log('Settings WebSocket disconnected');
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Settings WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.isOnline) {
        this.connectWebSocket();
      }
    }, 5000); // Retry after 5 seconds
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'settings_update':
          this.handleRemoteUpdate(data.change);
          break;
        case 'sync_request':
          this.syncSettings();
          break;
        case 'conflict_detected':
          this.handleConflict(data.conflict);
          break;
        default:
          console.warn('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleRemoteUpdate(remoteChange: SettingsChange): void {
    // Check if we have a pending local change for the same setting
    const localChangeIndex = this.pendingChanges.findIndex(
      change => 
        change.settingType === remoteChange.settingType && 
        change.settingKey === remoteChange.settingKey
    );

    if (localChangeIndex !== -1) {
      const localChange = this.pendingChanges[localChangeIndex];
      
      // If versions conflict, create a conflict
      if (localChange.version !== remoteChange.version) {
        const conflict: SyncConflict = {
          localChange,
          remoteChange,
        };
        this.conflicts.push(conflict);
        this.pendingChanges.splice(localChangeIndex, 1);
        this.savePendingChanges();
        
        // Notify about conflict
        this.notifyConflict(conflict);
      } else {
        // Same version, remove from pending
        this.pendingChanges.splice(localChangeIndex, 1);
        this.savePendingChanges();
      }
    }

    // Apply the remote change
    this.applySettingChange(remoteChange);
  }

  private handleConflict(conflict: SyncConflict): void {
    this.conflicts.push(conflict);
    this.notifyConflict(conflict);
  }

  private notifyConflict(conflict: SyncConflict): void {
    // Dispatch custom event for conflict notification
    const event = new CustomEvent('settingsConflict', { detail: conflict });
    window.dispatchEvent(event);
  }

  private applySettingChange(change: SettingsChange): void {
    // Store the setting in localStorage
    const settingsKey = `settings_${change.settingType}_${change.settingKey}`;
    localStorage.setItem(settingsKey, JSON.stringify({
      value: change.newValue,
      version: change.version,
      lastUpdated: change.timestamp.toISOString(),
    }));

    // Dispatch custom event for settings update
    const event = new CustomEvent('settingsUpdated', { 
      detail: { 
        settingType: change.settingType, 
        settingKey: change.settingKey, 
        value: change.newValue 
      } 
    });
    window.dispatchEvent(event);
  }

  async syncSettings(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.pendingChanges.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      // Send pending changes to server
      for (const change of this.pendingChanges) {
        await this.sendChangeToServer(change);
      }

      this.lastSync = new Date();
      this.pendingChanges = [];
      this.savePendingChanges();
      
      console.log('Settings synchronized successfully');
    } catch (error) {
      console.error('Failed to sync settings:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async sendChangeToServer(_change: SettingsChange): Promise<void> {
    // In a real implementation, this would send to your backend API
    // For now, we'll simulate the API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() < 0.95) { // 95% success rate for simulation
          resolve();
        } else {
          reject(new Error('Simulated network error'));
        }
      }, 100);
    });
  }

  queueChange(change: Omit<SettingsChange, 'id' | 'timestamp' | 'version'>): void {
    const fullChange: SettingsChange = {
      ...change,
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      version: Date.now(), // Simple versioning using timestamp
      deviceId: this.deviceId,
    };

  this.pendingChanges.push(fullChange);
    this.savePendingChanges();

    // Apply locally immediately
    this.applySettingChange(fullChange);

    // Try to sync if online
    if (this.isOnline) {
      this.syncSettings();
    }
  }

  resolveConflict(conflict: SyncConflict, resolvedValue: any): void {
    const resolvedChange: SettingsChange = {
      ...conflict.localChange,
      id: `resolved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      newValue: resolvedValue,
      version: Math.max(conflict.localChange.version, conflict.remoteChange.version) + 1,
    };

    // Remove the conflict
    this.conflicts = this.conflicts.filter(c => c !== conflict);

    // Queue the resolved change
    this.queueChange(resolvedChange);
  }

  getOfflineChanges(): SettingsChange[] {
    return [...this.pendingChanges];
  }

  clearOfflineChanges(): void {
    this.pendingChanges = [];
    this.savePendingChanges();
  }

  setAuthToken(token: string): void {
    this.authToken = token;
    if (this.isOnline) {
      this.connectWebSocket();
    }
  }

  get syncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: this.lastSync,
      pendingChanges: this.pendingChanges.length,
      conflicts: [...this.conflicts],
    };
  }
}

// Singleton instance
let syncServiceInstance: SettingsSyncServiceImpl | null = null;

export const getSettingsSyncService = (): SettingsSyncService => {
  if (!syncServiceInstance) {
    syncServiceInstance = new SettingsSyncServiceImpl();
  }
  return syncServiceInstance;
};

// React hook for using the sync service
export const useSettingsSync = (): SettingsSyncService => {
  const { user } = useAuth();
  const [service] = useState(() => getSettingsSyncService());

  useEffect(() => {
    // Cast to any to access internal method
    if (user) {
      (service as any).setAuthToken(user.id?.toString() || 'anonymous');
    }
  }, [user, service]);

  return service;
};

// Utility function to get setting value
export const getSetting = <T>(settingType: string, settingKey: string, defaultValue: T): T => {
  try {
    const settingsKey = `settings_${settingType}_${settingKey}`;
    const stored = localStorage.getItem(settingsKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.value;
    }
  } catch (error) {
    console.error('Failed to get setting:', error);
  }
  return defaultValue;
};

// Utility function to set setting value
export const setSetting = (settingType: string, settingKey: string, value: any): void => {
  const syncService = getSettingsSyncService();
  syncService.queueChange({
    userId: 'current', // Will be replaced with actual user ID
    settingType: settingType as any,
    settingKey,
    oldValue: getSetting(settingType, settingKey, null),
    newValue: value,
    deviceId: syncService.syncStatus.isOnline ? 'online' : 'offline',
  });
};