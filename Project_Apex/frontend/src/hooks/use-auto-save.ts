import { useState, useEffect, useRef, useCallback } from 'react';
import { useScreenReaderAnnouncement } from '@/utils/accessibility';

interface UseAutoSaveOptions<T> {
  value: T;
  onSave: (value: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  retry: () => void;
}

export const useAutoSave = <T>({
  value,
  onSave,
  delay = 1000,
  enabled = true,
  onSuccess,
  onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previousValueRef = useRef<T | undefined>(undefined);
  const announce = useScreenReaderAnnouncement();

  // Initialize previous value ref
  useEffect(() => {
    if (previousValueRef.current === undefined) {
      previousValueRef.current = value;
    }
  }, [value]);

  const save = useCallback(async () => {
    if (!enabled || !previousValueRef.current || JSON.stringify(value) === JSON.stringify(previousValueRef.current)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(value);
      previousValueRef.current = value;
      setLastSaved(new Date());
      setIsSaving(false);
      
      // Announce success to screen readers
      announce('Settings saved successfully');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save settings');
      setError(error);
      setIsSaving(false);
      
      // Announce error to screen readers
      announce('Failed to save settings', 'assertive');
      
      if (onError) {
        onError(error);
      }
    }
  }, [value, onSave, enabled, onSuccess, onError, announce]);

  const retry = useCallback(() => {
    save();
  }, [save]);

  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, enabled, save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    error,
    retry,
  };
};

interface UseDebouncedAutoSaveOptions<T> extends Omit<UseAutoSaveOptions<T>, 'delay'> {
  debounceDelay?: number;
  immediateSaveKeys?: (keyof T)[];
}

export const useDebouncedAutoSave = <T extends Record<string, unknown>>({
  value,
  onSave,
  debounceDelay = 1000,
  immediateSaveKeys = [],
  enabled = true,
  onSuccess,
  onError,
}: UseDebouncedAutoSaveOptions<T>): UseAutoSaveReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previousValueRef = useRef<T | undefined>(undefined);
  const announce = useScreenReaderAnnouncement();

  // Initialize previous value ref
  useEffect(() => {
    if (previousValueRef.current === undefined) {
      previousValueRef.current = value;
    }
  }, [value]);

  const shouldSaveImmediately = useCallback((currentValue: T, previousValue: T): boolean => {
    return immediateSaveKeys.some(key => 
      JSON.stringify(currentValue[key]) !== JSON.stringify(previousValue[key])
    );
  }, [immediateSaveKeys]);

  const save = useCallback(async (currentValue: T) => {
    if (!enabled || !previousValueRef.current || JSON.stringify(currentValue) === JSON.stringify(previousValueRef.current)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(currentValue);
      previousValueRef.current = currentValue;
      setLastSaved(new Date());
      setIsSaving(false);
      
      announce('Settings saved successfully');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save settings');
      setError(error);
      setIsSaving(false);
      
      announce('Failed to save settings', 'assertive');
      
      if (onError) {
        onError(error);
      }
    }
  }, [onSave, enabled, onSuccess, onError, announce]);

  const retry = useCallback(() => {
    save(value);
  }, [save, value]);

  useEffect(() => {
    if (!enabled || !previousValueRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if we should save immediately
    if (shouldSaveImmediately(value, previousValueRef.current)) {
      save(value);
      return;
    }

    // Set debounced timeout for other changes
    timeoutRef.current = setTimeout(() => {
      save(value);
    }, debounceDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, debounceDelay, enabled, save, shouldSaveImmediately]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    error,
    retry,
  };
};

interface UseAutoSaveWithStatusOptions<T> extends UseAutoSaveOptions<T> {
  showStatus?: boolean;
}

export const useAutoSaveWithStatus = <T>({
  value,
  onSave,
  delay = 1000,
  enabled = true,
  showStatus = true,
  onSuccess,
  onError,
}: UseAutoSaveWithStatusOptions<T>) => {
  const autoSave = useAutoSave({ value, onSave, delay, enabled, onSuccess, onError });
  
  const getStatusMessage = () => {
    if (autoSave.isSaving) {
      return 'Saving...';
    }
    
    if (autoSave.error) {
      return 'Failed to save';
    }
    
    if (autoSave.lastSaved) {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - autoSave.lastSaved.getTime()) / 1000);
      
      if (diffInSeconds < 5) {
        return 'Just now';
      } else if (diffInSeconds < 60) {
        return `${diffInSeconds} seconds ago`;
      } else {
        return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      }
    }
    
    return 'Not saved yet';
  };

  const getStatusColor = () => {
    if (autoSave.isSaving) return 'warning';
    if (autoSave.error) return 'error';
    if (autoSave.lastSaved) return 'success';
    return 'default';
  };

  return {
    ...autoSave,
    statusMessage: showStatus ? getStatusMessage() : '',
    statusColor: getStatusColor(),
  };
};