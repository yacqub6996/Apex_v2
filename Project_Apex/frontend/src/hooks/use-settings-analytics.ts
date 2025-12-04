import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';

export interface SettingsAnalyticsEvent {
  id: string;
  userId: string;
  eventType: 'settings_view' | 'settings_change' | 'settings_save' | 'settings_error' | 'settings_conflict';
  settingType: 'profile' | 'security' | 'notifications' | 'privacy' | 'analytics';
  settingKey?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  sessionId: string;
  deviceInfo: DeviceInfo;
  performanceMetrics?: PerformanceMetrics;
  errorDetails?: ErrorDetails;
}

export interface DeviceInfo {
  userAgent: string;
  screenResolution: string;
  language: string;
  timezone: string;
  platform: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  interactionTime: number;
  saveTime: number;
  errorRate: number;
}

export interface ErrorDetails {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  componentStack?: string;
}

export interface HeatmapData {
  x: number;
  y: number;
  intensity: number;
  timestamp: Date;
  elementType: string;
  elementId?: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number;
  settings: Record<string, any>;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface SettingsAnalytics {
  trackEvent: (event: Omit<SettingsAnalyticsEvent, 'id' | 'timestamp' | 'sessionId' | 'deviceInfo'>) => void;
  trackHeatmap: (data: Omit<HeatmapData, 'timestamp'>) => void;
  getABTestVariant: (testId: string) => ABTestVariant | null;
  getPerformanceMetrics: () => PerformanceMetrics;
  getSettingsUsage: (timeRange: 'day' | 'week' | 'month') => Promise<SettingsUsageStats>;
  exportAnalyticsData: () => Promise<Blob>;
  clearAnalyticsData: () => void;
}

export interface SettingsUsageStats {
  totalViews: number;
  totalChanges: number;
  totalSaves: number;
  totalErrors: number;
  totalConflicts: number;
  mostChangedSettings: Array<{ settingKey: string; changeCount: number }>;
  errorRate: number;
  saveSuccessRate: number;
  averageLoadTime: number;
  averageSaveTime: number;
}

class SettingsAnalyticsImpl implements SettingsAnalytics {
  private sessionId: string;
  private deviceInfo: DeviceInfo;
  private events: SettingsAnalyticsEvent[] = [];
  private heatmapData: HeatmapData[] = [];
  private abTests: ABTest[] = [];
  private performanceMetrics: PerformanceMetrics = {
    loadTime: 0,
    interactionTime: 0,
    saveTime: 0,
    errorRate: 0,
  };
  private userId: string | null = null;
  private analyticsEnabled = true;
  private privacyMode = false;

  constructor() {
    this.sessionId = this.getSessionId();
    this.deviceInfo = this.getDeviceInfo();
    this.loadStoredData();
    this.setupPerformanceMonitoring();
    this.setupABTests();
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('settings_analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('settings_analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: navigator.platform,
    };
  }

  private loadStoredData(): void {
    try {
      // Load events
      const storedEvents = localStorage.getItem('settings_analytics_events');
      if (storedEvents) {
        this.events = JSON.parse(storedEvents).map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp),
        }));
      }

      // Load heatmap data
      const storedHeatmap = localStorage.getItem('settings_analytics_heatmap');
      if (storedHeatmap) {
        this.heatmapData = JSON.parse(storedHeatmap).map((data: any) => ({
          ...data,
          timestamp: new Date(data.timestamp),
        }));
      }

      // Load performance metrics
      const storedMetrics = localStorage.getItem('settings_analytics_metrics');
      if (storedMetrics) {
        this.performanceMetrics = JSON.parse(storedMetrics);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      this.clearAnalyticsData();
    }
  }

  private saveStoredData(): void {
    if (this.privacyMode) return;

    try {
      localStorage.setItem('settings_analytics_events', JSON.stringify(this.events));
      localStorage.setItem('settings_analytics_heatmap', JSON.stringify(this.heatmapData));
      localStorage.setItem('settings_analytics_metrics', JSON.stringify(this.performanceMetrics));
    } catch (error) {
      console.error('Failed to save analytics data:', error);
    }
  }

  private setupPerformanceMonitoring(): void {
    // Monitor page load performance
    if (window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.performanceMetrics.loadTime = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      }
    }

    // Monitor interaction performance
    let interactionStartTime = 0;
    document.addEventListener('mousedown', () => {
      interactionStartTime = performance.now();
    });

    document.addEventListener('mouseup', () => {
      if (interactionStartTime > 0) {
        const interactionTime = performance.now() - interactionStartTime;
        this.performanceMetrics.interactionTime = interactionTime;
        interactionStartTime = 0;
      }
    });
  }

  private setupABTests(): void {
    // Define A/B tests for settings UI
    this.abTests = [
      {
        id: 'settings_layout_v1',
        name: 'Settings Layout Optimization',
        description: 'Test different settings page layouts for better user experience',
        variants: [
          {
            id: 'control',
            name: 'Current Layout',
            description: 'Existing tab-based layout',
            weight: 0.5,
            settings: {
              layout: 'tabs',
              sidebarPosition: 'left',
              grouping: 'categorized',
            },
          },
          {
            id: 'variant_a',
            name: 'Single Page Layout',
            description: 'All settings on single page with search',
            weight: 0.25,
            settings: {
              layout: 'single',
              sidebarPosition: 'none',
              grouping: 'flat',
              searchEnabled: true,
            },
          },
          {
            id: 'variant_b',
            name: 'Wizard Layout',
            description: 'Step-by-step settings configuration',
            weight: 0.25,
            settings: {
              layout: 'wizard',
              sidebarPosition: 'left',
              grouping: 'sequential',
              progressIndicator: true,
            },
          },
        ],
        startDate: new Date(),
        isActive: true,
      },
    ];
  }

  private getRandomVariant(test: ABTest): ABTestVariant {
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        return variant;
      }
    }

    return test.variants[0]; // Fallback to first variant
  }

  trackEvent(event: Omit<SettingsAnalyticsEvent, 'id' | 'timestamp' | 'sessionId' | 'deviceInfo'>): void {
    if (!this.analyticsEnabled || this.privacyMode) return;

    const fullEvent: SettingsAnalyticsEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo,
    };

    this.events.push(fullEvent);

    // Update performance metrics based on event type
    if (event.eventType === 'settings_error') {
      this.performanceMetrics.errorRate = (this.performanceMetrics.errorRate + 1) / 2; // Moving average
    }

    // Keep only last 1000 events to prevent storage overflow
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    this.saveStoredData();
    this.sendToBackend(fullEvent);
  }

  trackHeatmap(data: Omit<HeatmapData, 'timestamp'>): void {
    if (!this.analyticsEnabled || this.privacyMode) return;

    const fullData: HeatmapData = {
      ...data,
      timestamp: new Date(),
    };

    this.heatmapData.push(fullData);

    // Keep only last 5000 heatmap points
    if (this.heatmapData.length > 5000) {
      this.heatmapData = this.heatmapData.slice(-5000);
    }

    this.saveStoredData();
  }

  getABTestVariant(testId: string): ABTestVariant | null {
    const test = this.abTests.find(t => t.id === testId && t.isActive);
    if (!test) return null;

    // Get or assign variant for this session
    const storageKey = `ab_test_${testId}`;
    let variantId = sessionStorage.getItem(storageKey);

    if (!variantId) {
      const variant = this.getRandomVariant(test);
      variantId = variant.id;
      sessionStorage.setItem(storageKey, variantId);
      
      // Track assignment
      this.trackEvent({
        eventType: 'settings_view',
        settingType: 'analytics',
        settingKey: `ab_test_assignment_${testId}`,
        newValue: variantId,
        userId: this.userId || 'anonymous',
      });
    }

    return test.variants.find(v => v.id === variantId) || null;
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  async getSettingsUsage(timeRange: 'day' | 'week' | 'month'): Promise<SettingsUsageStats> {
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

    const filteredEvents = this.events.filter(event => event.timestamp >= startDate);

    const totalViews = filteredEvents.filter(e => e.eventType === 'settings_view').length;
    const totalChanges = filteredEvents.filter(e => e.eventType === 'settings_change').length;
    const totalSaves = filteredEvents.filter(e => e.eventType === 'settings_save').length;
    const totalErrors = filteredEvents.filter(e => e.eventType === 'settings_error').length;
    const totalConflicts = filteredEvents.filter(e => e.eventType === 'settings_conflict').length;

    // Calculate most changed settings
    const settingChanges = filteredEvents
      .filter(e => e.eventType === 'settings_change' && e.settingKey)
      .reduce((acc, event) => {
        const key = `${event.settingType}.${event.settingKey}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const mostChangedSettings = Object.entries(settingChanges)
      .map(([settingKey, changeCount]) => ({ settingKey, changeCount }))
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 10);

    const errorRate = totalChanges > 0 ? totalErrors / totalChanges : 0;
    const saveSuccessRate = totalSaves > 0 ? (totalSaves - totalErrors) / totalSaves : 1;

    // Calculate average times from performance metrics
    const saveEvents = filteredEvents.filter(e => e.eventType === 'settings_save');
    const averageSaveTime = saveEvents.length > 0 
      ? saveEvents.reduce((sum, event) => sum + (event.performanceMetrics?.saveTime || 0), 0) / saveEvents.length
      : 0;

    return {
      totalViews,
      totalChanges,
      totalSaves,
      totalErrors,
      totalConflicts,
      mostChangedSettings,
      errorRate,
      saveSuccessRate,
      averageLoadTime: this.performanceMetrics.loadTime,
      averageSaveTime,
    };
  }

  async exportAnalyticsData(): Promise<Blob> {
    const exportData = {
      events: this.events,
      heatmapData: this.heatmapData,
      performanceMetrics: this.performanceMetrics,
      abTests: this.abTests,
      exportTimestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    return blob;
  }

  clearAnalyticsData(): void {
    this.events = [];
    this.heatmapData = [];
    this.performanceMetrics = {
      loadTime: 0,
      interactionTime: 0,
      saveTime: 0,
      errorRate: 0,
    };
    
    localStorage.removeItem('settings_analytics_events');
    localStorage.removeItem('settings_analytics_heatmap');
    localStorage.removeItem('settings_analytics_metrics');
  }

  private sendToBackend(event: SettingsAnalyticsEvent): void {
    // In a real implementation, this would send to your analytics backend
    // For now, we'll simulate the API call
    if (navigator.sendBeacon) {
      const data = JSON.stringify(event);
      navigator.sendBeacon('/api/analytics/settings', data);
    } else {
      // Fallback to fetch
      fetch('/api/analytics/settings', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'Content-Type': 'application/json',
        },
        keepalive: true,
      }).catch(error => {
        console.error('Failed to send analytics event:', error);
      });
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setAnalyticsEnabled(enabled: boolean): void {
    this.analyticsEnabled = enabled;
    if (!enabled) {
      this.clearAnalyticsData();
    }
  }

  setPrivacyMode(enabled: boolean): void {
    this.privacyMode = enabled;
    if (enabled) {
      this.clearAnalyticsData();
    }
  }
}

// Singleton instance
let analyticsInstance: SettingsAnalyticsImpl | null = null;

export const getSettingsAnalytics = (): SettingsAnalytics => {
  if (!analyticsInstance) {
    analyticsInstance = new SettingsAnalyticsImpl();
  }
  return analyticsInstance;
};

// React hook for using analytics
export const useSettingsAnalytics = (): SettingsAnalytics => {
  const { user } = useAuth();
  const [analytics] = useState(() => getSettingsAnalytics());

  useEffect(() => {
    if (user?.id) {
      // Cast to any to access internal method
      (analytics as any).setUserId(user.id.toString());
    }
  }, [user?.id, analytics]);

  // Track settings page view
  useEffect(() => {
    analytics.trackEvent({
      eventType: 'settings_view',
      settingType: 'analytics',
      userId: user?.id?.toString() || 'anonymous',
    });
  }, [analytics, user?.id]);

  return analytics;
};
