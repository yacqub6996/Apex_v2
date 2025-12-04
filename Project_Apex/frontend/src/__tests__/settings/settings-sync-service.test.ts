import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { getSettingsSyncService, SettingsChange } from '../../services/settings-sync-service';

describe('SettingsSyncService', () => {
  let syncService: ReturnType<typeof getSettingsSyncService>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();
    syncService = getSettingsSyncService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create a unique device ID', () => {
      const deviceId1 = localStorage.getItem('settings_device_id');
      expect(deviceId1).toBeTruthy();

      // Create a new service instance
      localStorage.removeItem('settings_device_id');
      const newService = getSettingsSyncService();
      const deviceId2 = localStorage.getItem('settings_device_id');
      
      expect(deviceId1).not.toBe(deviceId2);
    });

    it('should load pending changes from localStorage', () => {
      const mockChanges: SettingsChange[] = [
        {
          id: 'test-1',
          userId: 'user-1',
          settingType: 'profile',
          settingKey: 'fullName',
          oldValue: 'Old Name',
          newValue: 'New Name',
          timestamp: new Date(),
          deviceId: 'device-1',
          version: 1,
        },
      ];

      localStorage.setItem('settings_pending_changes', JSON.stringify(mockChanges));
      
      const service = getSettingsSyncService();
      const offlineChanges = service.getOfflineChanges();
      
      expect(offlineChanges).toHaveLength(1);
      expect(offlineChanges[0].id).toBe('test-1');
    });
  });

  describe('queueChange', () => {
    it('should add change to pending changes', () => {
      const change: Omit<SettingsChange, 'id' | 'timestamp' | 'version'> = {
        userId: 'user-1',
        settingType: 'profile',
        settingKey: 'email',
        oldValue: 'old@email.com',
        newValue: 'new@email.com',
        deviceId: 'device-1',
      };

      syncService.queueChange(change);

      const pendingChanges = syncService.getOfflineChanges();
      expect(pendingChanges).toHaveLength(1);
      expect(pendingChanges[0].settingKey).toBe('email');
      expect(pendingChanges[0].newValue).toBe('new@email.com');
    });

    it('should save changes to localStorage', () => {
      const change: Omit<SettingsChange, 'id' | 'timestamp' | 'version'> = {
        userId: 'user-1',
        settingType: 'profile',
        settingKey: 'email',
        oldValue: 'old@email.com',
        newValue: 'new@email.com',
        deviceId: 'device-1',
      };

      syncService.queueChange(change);

      const stored = localStorage.getItem('settings_pending_changes');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].settingKey).toBe('email');
    });

    it('should apply setting locally immediately', () => {
      const change: Omit<SettingsChange, 'id' | 'timestamp' | 'version'> = {
        userId: 'user-1',
        settingType: 'profile',
        settingKey: 'theme',
        oldValue: 'light',
        newValue: 'dark',
        deviceId: 'device-1',
      };

      syncService.queueChange(change);

      // Check if setting was stored in localStorage
      const settingKey = `settings_profile_theme`;
      const stored = localStorage.getItem(settingKey);
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.value).toBe('dark');
    });
  });

  describe('syncStatus', () => {
    it('should return correct sync status', () => {
      const status = syncService.syncStatus;

      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('lastSync');
      expect(status).toHaveProperty('pendingChanges');
      expect(status).toHaveProperty('conflicts');

      expect(status.pendingChanges).toBe(0);
      expect(status.conflicts).toHaveLength(0);
    });

    it('should reflect pending changes count', () => {
      const change: Omit<SettingsChange, 'id' | 'timestamp' | 'version'> = {
        userId: 'user-1',
        settingType: 'profile',
        settingKey: 'email',
        oldValue: 'old@email.com',
        newValue: 'new@email.com',
        deviceId: 'device-1',
      };

      syncService.queueChange(change);
      syncService.queueChange({ ...change, settingKey: 'name' });

      const status = syncService.syncStatus;
      expect(status.pendingChanges).toBe(2);
    });
  });

  describe('conflict resolution', () => {
    it('should resolve conflicts', () => {
      const localChange: SettingsChange = {
        id: 'local-1',
        userId: 'user-1',
        settingType: 'profile',
        settingKey: 'email',
        oldValue: 'old@email.com',
        newValue: 'local@email.com',
        timestamp: new Date(),
        deviceId: 'device-1',
        version: 1,
      };

      const remoteChange: SettingsChange = {
        id: 'remote-1',
        userId: 'user-1',
        settingType: 'profile',
        settingKey: 'email',
        oldValue: 'old@email.com',
        newValue: 'remote@email.com',
        timestamp: new Date(),
        deviceId: 'device-2',
        version: 2,
      };

      const conflict = {
        localChange,
        remoteChange,
      };

      syncService.resolveConflict(conflict, 'resolved@email.com');

      const status = syncService.syncStatus;
      expect(status.conflicts).toHaveLength(0);
      expect(status.pendingChanges).toBe(1);
    });
  });

  describe('offline support', () => {
    it('should clear offline changes', () => {
      const change: Omit<SettingsChange, 'id' | 'timestamp' | 'version'> = {
        userId: 'user-1',
        settingType: 'profile',
        settingKey: 'email',
        oldValue: 'old@email.com',
        newValue: 'new@email.com',
        deviceId: 'device-1',
      };

      syncService.queueChange(change);
      expect(syncService.getOfflineChanges()).toHaveLength(1);

      syncService.clearOfflineChanges();
      expect(syncService.getOfflineChanges()).toHaveLength(0);
    });

    it('should persist changes when offline', () => {
      // Simulate offline mode
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const change: Omit<SettingsChange, 'id' | 'timestamp' | 'version'> = {
        userId: 'user-1',
        settingType: 'profile',
        settingKey: 'email',
        oldValue: 'old@email.com',
        newValue: 'new@email.com',
        deviceId: 'device-1',
      };

      syncService.queueChange(change);

      // Changes should be queued but not synced
      const status = syncService.syncStatus;
      expect(status.pendingChanges).toBe(1);
      expect(status.isOnline).toBe(false);

      // Restore online status
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });
    });
  });

  describe('utility functions', () => {
    it('should get setting value with default', async () => {
      const module = await import('@/services/settings-sync-service');
      const { getSetting } = module;
      
      const value = getSetting('profile', 'theme', 'light');
      expect(value).toBe('light');
    });

    it('should set setting value', async () => {
      const module = await import('@/services/settings-sync-service');
      const { setSetting } = module;
      
      setSetting('profile', 'theme', 'dark');
      
      const settingKey = `settings_profile_theme`;
      const stored = localStorage.getItem(settingKey);
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.value).toBe('dark');
    });
  });
});