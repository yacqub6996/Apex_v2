import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

/**
 * Hook for managing keyboard navigation in tab components
 */
export const useKeyboardNavigation = (itemCount: number, onSelect: (index: number) => void) => {
  const containerRef = useRef<HTMLElement>(null);
  const focusedIndexRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          focusedIndexRef.current = Math.min(focusedIndexRef.current + 1, itemCount - 1);
          onSelect(focusedIndexRef.current);
          break;
        
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          focusedIndexRef.current = Math.max(focusedIndexRef.current - 1, 0);
          onSelect(focusedIndexRef.current);
          break;
        
        case 'Home':
          event.preventDefault();
          focusedIndexRef.current = 0;
          onSelect(focusedIndexRef.current);
          break;
        
        case 'End':
          event.preventDefault();
          focusedIndexRef.current = itemCount - 1;
          onSelect(focusedIndexRef.current);
          break;
        
        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelect(focusedIndexRef.current);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [itemCount, onSelect]);

  return containerRef;
};

/**
 * Hook for managing focus trap in modal dialogs
 */
export const useFocusTrap = (isOpen: boolean) => {
  const modalRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the modal
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;
      
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0]?.focus();
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          // Escape key handling should be implemented by the modal component
          return;
        }

        if (event.key === 'Tab') {
          if (!modalRef.current) return;

          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as NodeListOf<HTMLElement>;

          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              event.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              event.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore focus when modal closes
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen]);

  return modalRef;
};

/**
 * Hook for screen reader announcements
 */
export const useScreenReaderAnnouncement = () => {
  const announceRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Create or get the live region element
    let liveRegion = document.getElementById('screen-reader-announcements');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'screen-reader-announcements';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(liveRegion);
    }

    announceRef.current = liveRegion;
  }, []);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      
      // Clear the message after a short delay to allow re-announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  return announce;
};

/**
 * Utility to generate ARIA labels for common UI patterns
 */
export const ariaLabels = {
  tabList: (label: string) => ({
    role: 'tablist',
    'aria-label': label,
  }),
  
  tab: (label: string, selected: boolean, index: number, total: number) => ({
    role: 'tab',
    'aria-selected': selected,
    'aria-controls': `tabpanel-${index}`,
    'aria-label': `${label} tab, ${index + 1} of ${total}`,
    tabIndex: selected ? 0 : -1,
  }),
  
  tabPanel: (index: number, labelledBy: string) => ({
    role: 'tabpanel',
    id: `tabpanel-${index}`,
    'aria-labelledby': labelledBy,
    tabIndex: 0,
  }),
  
  modal: (label: string) => ({
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': label,
  }),
  
  button: (label: string, disabled?: boolean) => ({
    'aria-label': label,
    disabled: disabled,
  }),
  
  switch: (label: string, checked: boolean) => ({
    role: 'switch',
    'aria-checked': checked,
    'aria-label': label,
  }),
  
  alert: (type: 'success' | 'error' | 'warning' | 'info') => ({
    role: 'alert',
    'aria-live': type === 'error' ? 'assertive' : 'polite',
  }),
};

/**
 * Utility to check if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Utility to check if user prefers high contrast
 */
export const prefersHighContrast = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Utility to generate accessible color contrast ratios
 */
export const getContrastColor = (backgroundColor: string): 'light' | 'dark' => {
  // Simple luminance calculation for contrast
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'dark' : 'light';
};

/**
 * Hook for managing form field announcements
 */
export const useFormFieldAnnouncement = () => {
  const announce = useScreenReaderAnnouncement();

  const announceFieldChange = (fieldName: string, value: string | boolean) => {
    const valueText = typeof value === 'boolean' 
      ? (value ? 'enabled' : 'disabled')
      : value;
    
    announce(`${fieldName} changed to ${valueText}`);
  };

  const announceFieldError = (fieldName: string, error: string) => {
    announce(`${fieldName} error: ${error}`, 'assertive');
  };

  const announceFieldSuccess = (fieldName: string) => {
    announce(`${fieldName} updated successfully`);
  };

  return {
    announceFieldChange,
    announceFieldError,
    announceFieldSuccess,
  };
};

/**
 * Utility to generate accessible IDs for form elements
 */
export const generateId = (prefix: string) => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Hook for managing virtual scrolling accessibility
 */
export const useVirtualScrollAccessibility = (
  totalItems: number,
  visibleItems: number,
  startIndex: number
) => {
  const announce = useScreenReaderAnnouncement();

  useEffect(() => {
    if (totalItems > visibleItems) {
      const visibleRange = `${startIndex + 1} to ${Math.min(startIndex + visibleItems, totalItems)}`;
      announce(`Showing items ${visibleRange} of ${totalItems}`);
    }
  }, [startIndex, totalItems, visibleItems, announce]);

  return {
    containerProps: {
      role: 'list',
      'aria-label': `List of ${totalItems} items`,
    },
    itemProps: (index: number) => ({
      role: 'listitem',
      'aria-posinset': index + 1,
      'aria-setsize': totalItems,
    }),
  };
};

/**
 * Hook for high contrast mode compatibility
 */
export const useHighContrastMode = () => {
  const theme = useTheme();
  const isHighContrast = useMediaQuery('(prefers-contrast: high)');
  
  const highContrastStyles = {
    border: isHighContrast ? `2px solid ${theme.palette.text.primary}` : 'none',
    backgroundColor: isHighContrast ? theme.palette.background.default : 'transparent',
    color: isHighContrast ? theme.palette.text.primary : 'inherit',
    '&:focus': {
      outline: isHighContrast ? `3px solid ${theme.palette.primary.main}` : 'none',
      outlineOffset: isHighContrast ? '2px' : '0',
    },
  };

  const getHighContrastStyles = (baseStyles: any = {}) => {
    if (!isHighContrast) return baseStyles;
    
    return {
      ...baseStyles,
      ...highContrastStyles,
    };
  };

  return {
    isHighContrast,
    highContrastStyles,
    getHighContrastStyles,
  };
};

/**
 * Enhanced focus indicator for high contrast mode
 */
export const useEnhancedFocusIndicator = () => {
  const { isHighContrast } = useHighContrastMode();
  
  const focusIndicatorStyles = {
    '&:focus-visible': {
      outline: isHighContrast ? '3px solid' : '2px solid',
      outlineColor: 'primary.main',
      outlineOffset: isHighContrast ? '3px' : '2px',
    },
  };

  return { focusIndicatorStyles };
};

/**
 * Utility to apply high contrast mode styles to components
 */
export const withHighContrast = (baseStyles: any) => {
  return {
    ...baseStyles,
    '@media (prefers-contrast: high)': {
      border: '2px solid',
      borderColor: 'text.primary',
      backgroundColor: 'background.default',
      color: 'text.primary',
    },
  };
};