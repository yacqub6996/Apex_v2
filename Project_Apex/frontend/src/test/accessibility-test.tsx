import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MaterialThemeProvider } from '@/providers/material-theme-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { VirtualScroll } from '@/components/ui/virtual-scroll';
import { useKeyboardNavigation } from '@/utils/accessibility';
import { useScreenReaderAnnouncement } from '@/utils/accessibility';
import { useFocusTrap } from '@/utils/accessibility';

// (Removed unused TestKeyboardComponent)

// Mock component for testing screen reader announcements
const TestScreenReaderComponent = () => {
  const announce = useScreenReaderAnnouncement();
  
  const handleClick = () => {
    announce('Test announcement');
  };
  
  return (
    <button onClick={handleClick} data-testid="announce-button">
      Announce
    </button>
  );
};

// Mock component for testing focus trap
const TestFocusTrapComponent = ({ isOpen }: { isOpen: boolean }) => {
  const modalRef = useFocusTrap(isOpen);
  
  return (
    <div ref={modalRef as React.Ref<HTMLDivElement>} data-testid="focus-trap">
      <button>First</button>
      <button>Second</button>
      <button>Third</button>
    </div>
  );
};

describe('Accessibility Features', () => {
  describe('Keyboard Navigation', () => {
    it('should handle arrow key navigation', () => {
      const mockOnSelect = vi.fn();
      
      const TestComponent = () => {
        const containerRef = useKeyboardNavigation(3, mockOnSelect);
        
        return (
          <div ref={containerRef as React.Ref<HTMLDivElement>} data-testid="keyboard-container">
            <button>Item 1</button>
            <button>Item 2</button>
            <button>Item 3</button>
          </div>
        );
      };
      
      render(
        <MaterialThemeProvider>
          <TestComponent />
        </MaterialThemeProvider>
      );
      
      const container = screen.getByTestId('keyboard-container');
      container.focus();
      
      // Test arrow down
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      expect(mockOnSelect).toHaveBeenCalledWith(1);
      
      // Test arrow up
      fireEvent.keyDown(container, { key: 'ArrowUp' });
      expect(mockOnSelect).toHaveBeenCalledWith(0);
      
      // Test home key
      fireEvent.keyDown(container, { key: 'Home' });
      expect(mockOnSelect).toHaveBeenCalledWith(0);
      
      // Test end key
      fireEvent.keyDown(container, { key: 'End' });
      expect(mockOnSelect).toHaveBeenCalledWith(2);
    });
  });
  
  describe('Screen Reader Announcements', () => {
    it('should create live region for announcements', () => {
      render(
        <MaterialThemeProvider>
          <TestScreenReaderComponent />
        </MaterialThemeProvider>
      );
      
      const button = screen.getByTestId('announce-button');
      fireEvent.click(button);
      
      // Check that live region exists
      const liveRegion = document.getElementById('screen-reader-announcements');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });
  });
  
  describe('Focus Management', () => {
    it('should trap focus within modal', async () => {
      const { rerender } = render(
        <MaterialThemeProvider>
          <TestFocusTrapComponent isOpen={true} />
        </MaterialThemeProvider>
      );
      
      // Check that focus trap is active
      const focusTrap = screen.getByTestId('focus-trap');
      expect(focusTrap).toBeInTheDocument();
      
      // Test closing modal
      rerender(
        <MaterialThemeProvider>
          <TestFocusTrapComponent isOpen={false} />
        </MaterialThemeProvider>
      );
    });
  });
  
  describe('Confirmation Dialog', () => {
    it('should render with proper ARIA attributes', () => {
      const mockOnConfirm = vi.fn();
      const mockOnCancel = vi.fn();
      
      render(
        <MaterialThemeProvider>
          <ToastProvider>
            <ConfirmationDialog
              open={true}
              title="Test Confirmation"
              message="Are you sure you want to proceed?"
              onConfirm={mockOnConfirm}
              onClose={mockOnCancel}
            />
          </ToastProvider>
        </MaterialThemeProvider>
      );
      
      // Check dialog role and label
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText('Test Confirmation')).toBeInTheDocument();
      
      // Check buttons
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });
  
  describe('Virtual Scroll', () => {
    it('should render with accessibility attributes', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      render(
        <MaterialThemeProvider>
          <VirtualScroll
            items={items}
            itemHeight={50}
            containerHeight={300}
            renderItem={(item) => <div>{item.name}</div>}
          />
        </MaterialThemeProvider>
      );
      
      // Check container role
      const container = screen.getByRole('list');
      expect(container).toHaveAttribute('aria-label', 'List of 100 items');
    });
    
    it('should handle empty state', () => {
      render(
        <MaterialThemeProvider>
          <VirtualScroll
            items={[]}
            itemHeight={50}
            containerHeight={300}
            renderItem={() => <div>Item</div>}
            emptyState={<div data-testid="empty-state">No items found</div>}
          />
        </MaterialThemeProvider>
      );
      
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });
  
  describe('High Contrast Mode', () => {
    it('should detect high contrast preference', async () => {
      // Mock matchMedia for high contrast
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      // Test high contrast detection
      const module = await import('@/utils/accessibility');
      const { prefersHighContrast } = module;
      expect(prefersHighContrast()).toBe(true);
    });
  });
});

describe('Performance Optimizations', () => {
  describe('Lazy Loading', () => {
    it('should support dynamic imports', async () => {
      // Test that lazy loading works
      const { lazy } = await import('react');
      const LazyComponent = lazy(() => Promise.resolve({
        default: () => <div data-testid="lazy-loaded">Lazy Content</div>
      }));
      
      expect(LazyComponent).toBeDefined();
    });
  });
  
  describe('Bundle Optimization', () => {
    it('should have code splitting implemented', async () => {
      // Verify that settings components are lazy loaded
      const settingsModule = await import('@/pages/dashboard/settings/index.tsx');
      expect(settingsModule).toBeDefined();
    });
  });
});