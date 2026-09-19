/**
 * Support Widget Store
 *
 * Manages the state of the floating support chat widget including:
 * - Open/closed state
 * - Thread ID persistence per user for session continuity
 * - User-scoped localStorage keys for memory state
 */

import { useSyncExternalStore, useMemo, useEffect } from 'react';

const WIDGET_STATE_KEY = 'apex_support_widget_state';
const THREAD_ID_KEY_PREFIX = 'apex_support_thread_';

interface WidgetState {
  isOpen: boolean;
}

interface SupportWidgetStore {
  isOpen: boolean;
  isSuppressed: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  getThreadId: (userId: string) => string | null;
  setThreadId: (userId: string, threadId: string) => void;
  clearThreadId: (userId: string) => void;
  registerModalOpen: () => () => void;
}

class SupportWidgetStoreImpl {
  private isOpen = false;
  private activeModalCount = 0;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Load widget state from localStorage
    try {
      const savedState = localStorage.getItem(WIDGET_STATE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState) as WidgetState;
        // Start closed by default but preserve preference
        this.isOpen = parsed.isOpen ?? false;
      }
    } catch {
      this.isOpen = false;
    }
  }

  private saveState() {
    if (typeof window === 'undefined') return;

    try {
      const state: WidgetState = { isOpen: this.isOpen };
      localStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  getSnapshot = (): boolean => {
    return this.isOpen;
  };

  getSuppressedSnapshot = (): boolean => {
    return this.activeModalCount > 0;
  };

  registerModalOpen = (): (() => void) => {
    this.activeModalCount++;
    this.notifyListeners();
    let cleaned = false;
    return () => {
      if (!cleaned) {
        cleaned = true;
        this.activeModalCount = Math.max(0, this.activeModalCount - 1);
        this.notifyListeners();
      }
    };
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setOpen = (open: boolean) => {
    this.isOpen = open;
    this.saveState();
    this.notifyListeners();
  };

  toggle = () => {
    this.setOpen(!this.isOpen);
  };

  /**
   * Get the thread ID for a specific user
   * This enables session continuity - users can continue previous conversations
   */
  getThreadId(userId: string): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(`${THREAD_ID_KEY_PREFIX}${userId}`);
    } catch {
      return null;
    }
  }

  /**
   * Set the thread ID for a specific user
   * Called when a new thread is created or selected
   */
  setThreadId(userId: string, threadId: string) {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(`${THREAD_ID_KEY_PREFIX}${userId}`, threadId);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Clear the thread ID for a specific user
   * Called when user wants to start a new conversation
   */
  clearThreadId(userId: string) {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(`${THREAD_ID_KEY_PREFIX}${userId}`);
    } catch {
      // Ignore storage errors
    }
  }
}

// Create singleton instance
const supportWidgetStore = new SupportWidgetStoreImpl();

/**
 * React hook for using the support widget store
 * Uses useSyncExternalStore for proper React integration
 */
export const useSupportWidgetStore = (): SupportWidgetStore => {
  const isOpen = useSyncExternalStore(
    supportWidgetStore.subscribe,
    supportWidgetStore.getSnapshot,
    supportWidgetStore.getSnapshot
  );
  const isSuppressed = useSyncExternalStore(
    supportWidgetStore.subscribe,
    supportWidgetStore.getSuppressedSnapshot,
    supportWidgetStore.getSuppressedSnapshot
  );

  // Memoize the returned object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      isOpen,
      isSuppressed,
      setOpen: supportWidgetStore.setOpen,
      toggle: supportWidgetStore.toggle,
      getThreadId: (userId: string) => supportWidgetStore.getThreadId(userId),
      setThreadId: (userId: string, threadId: string) => supportWidgetStore.setThreadId(userId, threadId),
      clearThreadId: (userId: string) => supportWidgetStore.clearThreadId(userId),
      registerModalOpen: supportWidgetStore.registerModalOpen,
    }),
    [isOpen, isSuppressed]
  );
};

/**
 * Convenience hook to suppress the floating support widget while a modal or overlay is active
 */
export const useModalSuppression = (active: boolean = true) => {
  useEffect(() => {
    if (!active) return;
    const cleanup = supportWidgetStore.registerModalOpen();
    return cleanup;
  }, [active]);
};

// Export for direct access if needed
export { supportWidgetStore };
export type { SupportWidgetStore };
