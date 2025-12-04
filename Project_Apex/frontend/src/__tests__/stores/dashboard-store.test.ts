import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardStore } from '@/stores/dashboard-store';

describe('Dashboard Store - Personalization', () => {
  beforeEach(() => {
    // Clear store state before each test
    const store = useDashboardStore.getState();
    act(() => {
      store.setPreferredCurrency('USD');
      store.setActiveDashboardTab(null);
      if (store.useCompactLayout) {
        store.toggleCompactLayout();
      }
    });
  });

  describe('Currency Preference', () => {
    it('defaults to USD', () => {
      const { result } = renderHook(() => useDashboardStore());
      expect(result.current.preferredCurrency).toBe('USD');
    });

    it('can set preferred currency', () => {
      const { result } = renderHook(() => useDashboardStore());
      
      act(() => {
        result.current.setPreferredCurrency('EUR');
      });
      
      expect(result.current.preferredCurrency).toBe('EUR');
    });

    it('supports all currency types', () => {
      const { result } = renderHook(() => useDashboardStore());
      const currencies = ['USD', 'EUR', 'NGN', 'BTC'] as const;
      
      currencies.forEach((currency) => {
        act(() => {
          result.current.setPreferredCurrency(currency);
        });
        
        expect(result.current.preferredCurrency).toBe(currency);
      });
    });
  });

  describe('Active Dashboard Tab', () => {
    it('defaults to null', () => {
      const { result } = renderHook(() => useDashboardStore());
      expect(result.current.activeDashboardTab).toBeNull();
    });

    it('can set active tab', () => {
      const { result } = renderHook(() => useDashboardStore());
      
      act(() => {
        result.current.setActiveDashboardTab('executions-tab:copy-trading');
      });
      
      expect(result.current.activeDashboardTab).toBe('executions-tab:copy-trading');
    });

    it('can clear active tab', () => {
      const { result } = renderHook(() => useDashboardStore());
      
      act(() => {
        result.current.setActiveDashboardTab('some-tab');
        result.current.setActiveDashboardTab(null);
      });
      
      expect(result.current.activeDashboardTab).toBeNull();
    });
  });

  describe('Compact Layout', () => {
    it('defaults to false', () => {
      const { result } = renderHook(() => useDashboardStore());
      expect(result.current.useCompactLayout).toBe(false);
    });

    it('can toggle compact layout', () => {
      const { result } = renderHook(() => useDashboardStore());
      
      act(() => {
        result.current.toggleCompactLayout();
      });
      
      expect(result.current.useCompactLayout).toBe(true);
      
      act(() => {
        result.current.toggleCompactLayout();
      });
      
      expect(result.current.useCompactLayout).toBe(false);
    });
  });
});
